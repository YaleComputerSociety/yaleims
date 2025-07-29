import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const deleteBracket = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const { sport } = req.body;

      if (!sport) {
        res
          .status(400)
          .json({ error: "Invalid 'sport' parameter in request body." });
        return;
      }

      const currentSeasonInfo = await db
        .collection("seasons")
        .doc("current")
        .get();

      if (!currentSeasonInfo.exists) {
        res.status(500).json({ error: "Current season not found." });
        return;
      }

      const currentYear = currentSeasonInfo.data()?.year;

      const bracketRef = db
        .collection("brackets")
        .doc("seasons")
        .collection(currentYear)
        .doc(sport);

      const bracketDoc = await bracketRef.get();

      if (!bracketDoc.exists) {
        res
          .status(404)
          .json({ error: `Bracket for sport '${sport}' not found.` });
        return;
      }

      const bracketData = bracketDoc.data();
      const matches = bracketData?.matches || [];

      const batch = db.batch();

      const matchIdsToDelete: string[] = [];

      // extract match ids
      for (const matchEntry of matches) {
        if (matchEntry && matchEntry.match_id) {
          matchIdsToDelete.push(matchEntry.match_id);
        }
      }

      // delete all matches
      for (const matchId of matchIdsToDelete) {
        const matchRef = db.collection("matches_testing").doc(matchId);
        batch.delete(matchRef);
      }

      // delete bracket itself
      batch.delete(bracketRef);

      await batch.commit();

      res.status(200).json({
        message: `Successfully deleted bracket for sport '${sport}' and ${matchIdsToDelete.length} associated matches.`,
      });
    } catch (error) {
      console.error("Error deleting bracket:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});
