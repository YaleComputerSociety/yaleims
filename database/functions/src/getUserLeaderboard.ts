import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

interface User {
  id: string;
  username: string;
  points: number;
  correctPredictions: number;
  college: string;
}

export const getUserLeaderboard = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      console.log("Fetching leaderboard data...");
      const leaderboardRef = db.collection("users");
      const snapshot = await leaderboardRef
        .orderBy("points", "desc")
        .orderBy("correctPredictions", "desc")
        .orderBy("username", "asc")
        .limit(10)
        .get();

      if (snapshot.empty) {
        console.log("No users found in leaderboard.");
        res.status(404).send("No users found");
        return;
      }

      const leaderboard: User[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        leaderboard.push({
          username: data.username,
          points: data.points,
          correctPredictions: data.correctPredictions,
          college: data.college,
        } as User);
      });

      res.status(200).json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});
