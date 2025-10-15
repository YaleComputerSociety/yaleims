import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import { isValidDecodedToken } from "./helpers.js";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const getBets = functions.https.onRequest((req, res) => {
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
    const { pending, history, seasonId } = req.query;

    /* ───────────────────────── 0. validate input ───────────────────────── */
    if (typeof email !== "string" || email.trim() === "")
      return res.status(400).send("email query‑param must be a non‑empty string");

    const wantPending  = pending  === "true";
    const wantHistory  = history  === "true";

    if (!wantPending && !wantHistory)
      return res.status(400).send("Specify either pending=true or history=true");

    if (wantPending && wantHistory)
      return res.status(400).send("Choose only one of pending or history");

    if (wantPending && (typeof seasonId !== "string" || seasonId.trim() === ""))
      return res.status(400).send("pending=true also needs seasonId=<year‑range>");

    try {
      /* ───────────────────── 1. confirm the user exists ─────────────────── */
      const userRef = db.collection("users").doc(email as string);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).send("User not found");

      /* common helper that turns one bet document into the enriched object */
      const buildBet = async (betDoc: FirebaseFirestore.QueryDocumentSnapshot, s: string) => {
        const bet = betDoc.data();
        const betArraySnap = await betDoc.ref.collection("betArray").get();
        const isPending = (bet.currentCashed ?? 0) !== betArraySnap.size;

        const subBets = await Promise.all(
          betArraySnap.docs.map(async subBetDoc => {
            const subBet = subBetDoc.data();
            let winner: string | null = null;
            let matchTimestamp: string | null = null;

            if (subBet.matchId) {
              const matchDoc = await db.collection("matches").doc("seasons").collection(s).doc(subBet.matchId).get();
              if (matchDoc.exists) {
                const match = matchDoc.data();
                winner         = match?.winner ?? null;
                matchTimestamp = match?.timestamp?.toDate()?.toISOString() ?? null;
              }
            }

            return {
              id: subBetDoc.id,
              ...subBet,
              winner,
              matchTimestamp,
            };
          })
        );

        return {
          betId        : betDoc.id,
          createdAt    : bet.createdAt?.toDate()?.toISOString() ?? null,
          currentCashed: bet.currentCashed ?? null,
          totalOdds    : bet.betOdds,
          betAmount    : bet.betAmount,
          betArray     : subBets,
          won          : bet.won ?? null,
          isPending: isPending,
        };
      };

      /* ─────────────────────────── 2A. pending ─────────────────────────── */
      if (wantPending) {
        const betsSnap = await userRef
          .collection("seasons")
          .doc(seasonId as string)
          .collection("bets")
          .orderBy("createdAt", "desc")
          .get();

        const pendingBets = (
          await Promise.all(
            betsSnap.docs.map(doc => buildBet(doc, seasonId as string)) // ← here
          )
        ).filter(b => b.isPending);

        return res.status(200).json(pendingBets);               // []
      }

      /* ─────────────────────────── 2B. history ─────────────────────────── */
      if (wantHistory) {
        const seasonsSnap = await userRef.collection("seasons").get();

        // grab every season in parallel
        const seasonResults = await Promise.all(
          seasonsSnap.docs.map(async seasonDoc => {
            const sid = seasonDoc.id;            // e.g. "2024‑2025"
            const betsSnap = await seasonDoc.ref
              .collection("bets")
              .orderBy("createdAt", "desc")
              .get();
            
            const finishedBets = (
              await Promise.all(
                betsSnap.docs.map(doc => buildBet(doc, sid))           // ← and here
              )
            ).filter(b => !b.isPending);

            return { sid, finishedBets };
          })
        );

        // assemble { "2024‑2025": [...], "2025‑2026": [...] }
        const historyDict: Record<string, unknown[]> = {};
        seasonResults.forEach(({ sid, finishedBets }) => {
          historyDict[sid] = finishedBets;       // may be []
        });

        return res.status(200).json(historyDict); // {}
      }

      // If neither wantPending nor wantHistory, return a default response (should not be reached due to earlier validation)
      return res.status(400).send("Invalid request");
    } catch (err) {
      console.error("Error fetching bets:", err);
      return res.status(500).send("Internal Server Error");
    }
  });
});
