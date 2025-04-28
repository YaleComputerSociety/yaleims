import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const getBets = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const { email, pending, history } = req.query;

    // ── 0. validate query params ─────────────────────────────
    if (typeof email !== "string" || email.trim() === "") {
      return res.status(400).send("email query-param must be a non-empty string");
    }
    const wantPending = pending === "true";
    const wantHistory = history === "true";
    if (wantPending && wantHistory) {
      return res.status(400).send("Choose either pending=true or history=true, not both");
    }

    try {
      // ── 1. make sure the user exists ───────────────────────
      const userRef = db.collection("users").doc(email);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).send("User not found");

      // ── 2. newest-first list of bet docs ───────────────────
      const betsSnap = await userRef
        .collection("bets")
        .orderBy("createdAt", "desc")
        .get();
      if (betsSnap.empty) return res.status(404).send("No bets found");

      const results: any[] = [];

      // ── 3. walk every bet ──────────────────────────────────
      for (const betDoc of betsSnap.docs) {
        const betData = betDoc.data();       // has currentCashed, createdAt, …
        const betId = betDoc.id;

        // 3a. grab its betArray sub-collection
        const betArraySnap = await betDoc.ref.collection("betArray").get();
        const betArraySize = betArraySnap.size;
        const isPending  = (betData.currentCashed ?? 0) !== betArraySize;

        // 3b. filter by requested status
        if (wantPending && !isPending) continue;  // skip non-pending
        if (wantHistory &&  isPending) continue;  // skip pending

        // 3c. build the sub-bets (+ match info)
        const subBets: any[] = [];
        for (const subBetDoc of betArraySnap.docs) {
          const subBet = subBetDoc.data();

          // enrich with winner / timestamp (optional)
          let winner: string | null = null;
          let matchTimestamp: string | null = null;

          if (subBet.matchId) {
            const matchDoc = await db.collection("matches").doc(subBet.matchId).get();
            if (matchDoc.exists) {
              const match = matchDoc.data();
              winner         = match?.winner ?? null;
              matchTimestamp = match?.timestamp?.toDate()?.toISOString() ?? null;
            }
          }

          subBets.push({
            id: subBetDoc.id,
            winner,
            matchTimestamp,
            ...subBet,
          });
        }

        // 3d. push final object
        results.push({
          betId,
          createdAt : betData.createdAt?.toDate()?.toISOString() ?? null,
          currentCashed : betData.currentCashed ?? null,
          totalOdds : betData.betOdds,
          betAmount : betData.betAmount,
          betArray : subBets,
          won : betData.won ?? null,
        });
      }

      return res.status(200).json(results);
    } catch (err) {
      console.error("Error fetching bets:", err);
      return res.status(500).send("Internal Server Error");
    }
  });
});
