import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

// Enable CORS
const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const getLeaderboard = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const leaderboardRef = db.collection("colleges");
      const snapshot = await leaderboardRef
        .orderBy("points", "desc")
        .orderBy("wins", "desc")
        .get();

      if (snapshot.empty) {
        res.status(404).send("No colleges found.");
        return;
      }

      const leaderboard = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.status(200).json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});
