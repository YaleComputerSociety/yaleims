import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const getUserMatches = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { userId } = req.query;

      if (!userId) {
        res.status(400).send("Missing userId parameter");
        return;
      }

      const userDoc = await db
        .collection("users")
        .doc(userId as string)
        .get();

      if (!userDoc.exists) {
        res.status(404).send("User not found");
        return;
      }

      const userData = userDoc.data();
      const matches = userData?.matches || []; // Default to empty array if no matches

      // Filter matches to include only those happening in the future
      const now = new Date();
      const futureMatches = matches.filter((match: any) => {
        const matchTimestamp = new Date(match.timestamp);
        return matchTimestamp > now; // Include matches with a timestamp in the future
      });

      res.status(200).json(futureMatches);
    } catch (error) {
      console.error("Error fetching user matches:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});
