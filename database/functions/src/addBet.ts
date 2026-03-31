import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import { isValidDecodedToken } from "./helpers.js";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { recalcOddsForMatch } from "./recalcOdds.js";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

// Convert probability to multiplier: 1/prob
function probabilityToMultiplier(probability: number): number {
  if (probability <= 0) return 1;
  return 1 / probability;
}

function getOddsForBetOption(
  calculatedOdds: { home_college_odds: number; away_college_odds: number; draw_odds: number },
  betOption: string,
  leg: { home_college: string; away_college: string }
): number {
  let prob: number;
  if (betOption === "Draw") prob = calculatedOdds.draw_odds;
  else if (betOption === leg.away_college) prob = calculatedOdds.away_college_odds;
  else if (betOption === leg.home_college) prob = calculatedOdds.home_college_odds;
  else throw new Error(`Invalid betOption: ${betOption}`);

  return probabilityToMultiplier(prob);
}


interface Bet {
  away_college: string;
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
}

export const addBet = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const authHeader = req.headers.authorization || ""
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({error: "No token provided"});
    }
    
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: "projects/yims-125a2/secrets/JWT_SECRET/versions/1",
    });
    if (!version.payload || !version.payload.data) {
      console.error("JWT secret payload is missing");
      return res.status(500).send("Internal Server Error");
    }
    const JWT_SECRET = version.payload.data.toString();

    const token = authHeader.split("Bearer ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isValidDecodedToken(decoded)) {
      console.error("Invalid token structure");
      return res.status(401).json({error: "Invalid Token Structure"})
    }
    const email = decoded.email;
    const { seasonId } = req.query as { seasonId: string };
    const { betAmount, betArray } = req.body as AddBetRequestBody;
    const currentCashed = 0 

    if (!email || !Array.isArray(betArray) || betArray.length === 0)
      {console.log("must supply bets")
      return res.status(400).send("Must supply email and ≥1 bets");}

    try {
      const userSeasonRef = db.collection("users").doc(email).collection("seasons").doc(seasonId);
      const userSnap = await userSeasonRef.get();
      if (!userSnap.exists) return res.status(404).send("User not found");

      // Fetch all matches and calculate odds server-side using Elo
      const now = new Date();
      const calculatedLegs: (Bet & { betOdds: number })[] = [];
      let totalOdds = 1;

      for (const leg of betArray) {
        const matchRef = db
          .collection("matches")
          .doc("seasons")
          .collection(seasonId)
          .doc(leg.matchId);

        const matchSnap = await matchRef.get();
        if (!matchSnap.exists) {
          return res.status(404).json({ error: `Match not found: ${leg.matchId}` });
        }

        const matchData = matchSnap.data();
        if (!matchData?.timestamp) {
          return res.status(500).json({ error: `Timestamp missing for match ${leg.matchId}` });
        }
        const matchDate = matchData.timestamp.toDate();
        if (now >= matchDate) {
          return res.status(400).json({
            error: `Betting period has ended for one or more matches (${leg.matchId})`,
          });
        }

        // Calculate odds using current Elo + pre-bet volume (determines this bet's payout)
        const calculatedOdds = await recalcOddsForMatch(matchRef, matchData as any, seasonId);
        const legOdds = getOddsForBetOption(calculatedOdds, leg.betOption, leg);

        totalOdds *= legOdds;
        calculatedLegs.push({ ...leg, betOdds: legOdds });
      }

      const finalOdds = totalOdds;

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
          legCount: calculatedLegs.length,
        });

        const sanitizedEmail = email.replace(/\./g, "_");

        for (const leg of calculatedLegs) {
          const legRef = parlayRef.collection("betArray").doc();
          tx.set(legRef, leg);
          const matchRef = db.collection("matches").doc("seasons").collection(seasonId).doc(leg.matchId);

          tx.update(matchRef, {
            [`predictions.${sanitizedEmail}.${parlayRef.id}`]: {
              betOption: leg.betOption,
              betAmount: betAmount,
              betOdds: leg.betOdds,
              isParlay: calculatedLegs.length > 1,
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

      // Recalculate stored odds with updated volume so next viewer sees fresh odds
      try {
        const uniqueMatchIds = [...new Set(calculatedLegs.map((l) => l.matchId))];
        await Promise.all(
          uniqueMatchIds.map(async (matchId) => {
            const ref = db.collection("matches").doc("seasons").collection(seasonId).doc(matchId);
            const snap = await ref.get();
            const data = snap.data();
            if (data) await recalcOddsForMatch(ref, data as any, seasonId);
          })
        );
      } catch (err) {
        console.error("Post-bet odds recalc failed (bet still placed):", err);
      }

      return res.status(200).json({message: "Parlay added successfully"});
    } catch (err) {
      console.error("Error adding parlay:", err);
      return res.status(500).json("Internal Server Error");
    }
  });
});