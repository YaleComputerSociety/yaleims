import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

/* ──────────────────────────  TYPES  ────────────────────────── */

interface Bet {
  away_college: string;
  betOdds: number;
  betOption: string;
  home_college: string;
  matchId: string;
  sport: string;
  winner?: string;
  won?: boolean;
  matchTimestamp: string;
  betId: number
}

interface AddBetRequestBody {
  betAmount: number;
  betArray: Bet[];
  totalOdds: number
}

export const addBetMod = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const authHeader = req.headers.authorization || ""
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({error: "No token provided"});
    }
    const token = authHeader.split("Bearer ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isValidDecodedToken(decoded)) {
      console.error("Invalid token structure");
      return res.status(401).json({error: "Invalid Token Structure"})
    }
    const email = decoded.email;
    const { seasonId } = req.query as { seasonId: string };
    const { betAmount, betArray, totalOdds } = req.body as AddBetRequestBody;
    const currentCashed = 0 

    if (!email || !Array.isArray(betArray) || betArray.length === 0)
      {console.log("must supply bets")
      return res.status(400).send("Must supply email and ≥1 bets");}

    const finalOdds = totalOdds;
    try {
      const userSeasonRef = db.collection("users").doc(email).collection("seasons").doc(seasonId);
      const userSnap = await userSeasonRef.get();
      if (!userSnap.exists) return res.status(404).send("User not found");

      await Promise.all(
        betArray.map(async (leg) => {
          const mSnap = await db.collection("matches").doc("seasons").collection(seasonId).doc(leg.matchId).get();
          if (!mSnap.exists)
            throw new Error(`Match not found: ${leg.matchId}`);
        })
      );

      await db.runTransaction(async (tx) => {
        tx.update(userSeasonRef, {
          "points": admin.firestore.FieldValue.increment(-betAmount),
        });

        const parlayRef = userSeasonRef.collection("bets").doc();
        tx.set(parlayRef, {
          betAmount,
          betOdds: finalOdds,
          currentCashed,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          won: null,
          legCount: betArray.length,
        });

        const sanitizedEmail = email.replace(/\./g, "_");

        for (const leg of betArray) {
          /* i.   Store the leg under /betArray */
          
          const legRef = parlayRef.collection("betArray").doc();
          tx.set(legRef, leg);

          /* ii.  Update predictions + volume on the match doc */
          const matchRef = db.collection("matches").doc("seasons").collection(seasonId).doc(leg.matchId);

          tx.update(matchRef, {
            [`predictions.${sanitizedEmail}.${parlayRef.id}`]: {
              betOption: leg.betOption,
              betAmount: betAmount,
              betOdds: leg.betOdds,
              isParlay: betArray.length > 1,
              legId: legRef.id,
            },
          });

          const volField =
            leg.betOption === "Default"
              ? "default_volume"
              : leg.betOption === "Draw"
              ? "draw_volume"
              : leg.betOption === leg.away_college
              ? "away_volume"
              : leg.betOption === leg.home_college
              ? "home_volume"
              : null;

          if (!volField) throw new Error(`Invalid betOption: ${leg.betOption}`);

          tx.update(matchRef, {
            [volField]: admin.firestore.FieldValue.increment(betAmount),
          });
        }
      });

      /* ---------- 6. Done ---------- */
      return res.status(200).send("Parlay added successfully");
    } catch (err) {
      console.error("Error adding parlay:", err);
      return res.status(500).send("Internal Server Error");
    }
  });
});