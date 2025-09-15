import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const getLeaderboardv2 = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
        const seasonId = (req.query.seasonId as string) || "2025-2026";
        const leaderboardRef = db.collection("colleges").doc("seasons").collection(seasonId);
        const snapshot = await leaderboardRef
            .orderBy("points", "desc")
            .orderBy("wins", "desc")
            .get();

        if (snapshot.empty) {
            return res.status(404).send("No colleges found.");
        }

        const leaderboard = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return res.status(200).json(leaderboard);
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            return res.status(500).send("Internal Server Error");
        }
    });
});
