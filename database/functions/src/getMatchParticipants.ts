import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const getMatchParticipants = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const matchId = req.query.matchId as string;
      if (!matchId) {
        res.status(400).send("Missing matchId parameters");
      }

      const matchDoc = await db.collection("matches").doc(matchId).get();

      if (!matchDoc.exists) {
        res.status(404).send("Match Not Found");
        return;
      }

      const matchData = matchDoc.data();

      const participants = {
        home_college_participants: matchData?.home_college_participants || [],
        away_college_participants: matchData?.away_college_participants || [],
      };

      res.status(200).json(participants);
    } catch (error) {
      console.error("Error fetching match participants:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});
