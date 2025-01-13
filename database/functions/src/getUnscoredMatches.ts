import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

// gets unscored matches (winner is null) that have already occurred (timestamp is in the past)
export const getUnscoredMatches = functions.https.onRequest(
  async (req, res) => {
    console.log("function invoked");
    return corsHandler(req, res, async () => {
      try {
        const currentDate = admin.firestore.Timestamp.now();

        console.log(currentDate);

        const test = await db
          .collection("matches")
          .where("timestamp", "<", currentDate);

        console.log(test);

        const snapshot = await db
          .collection("matches")
          .where("winner", "==", null)
          .where("timestamp", "<", currentDate) // get past matches
          .orderBy("timestamp", "asc") // orders oldest first
          .get();

        if (snapshot.empty) {
          return res.status(200).json({ success: true, matches: [] });
        }

        const matches = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return res.status(200).json({ success: true, matches: matches });
      } catch (error) {
        console.error("Error fetching unscored matches:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);
