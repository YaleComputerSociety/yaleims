import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

/**
 * Lists every tournament in a season, newest first. Public: the tournament page
 * needs it before a user signs in, and it exposes nothing a bracket does not.
 */
export const getTournaments = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      let year = typeof req.query.year === "string" ? req.query.year : "";

      if (!year) {
        const currentSnap = await db.collection("seasons").doc("current").get();
        if (!currentSnap.exists) {
          return res.status(404).json({ error: "current season doc missing" });
        }
        year = currentSnap.data()?.year;
      }

      const snapshot = await db
        .collection("tournaments")
        .doc("seasons")
        .collection(year)
        .get();

      const tournaments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toMillis?.() ?? null,
          matches: (data.matches || []).map((match: any) => ({
            ...match,
            timestamp: match.timestamp?.toMillis?.() ?? null,
          })),
        };
      });

      tournaments.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

      return res.status(200).json({ year, tournaments });
    } catch (err) {
      console.error("Error fetching tournaments:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
