import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

const matchRounds: Record<number, string> = {
  1: "Bye",
  2: "Quarterfinal",
  3: "Quarterfinal",
  4: "Quarterfinal",
  5: "Semifinal",
  6: "Semifinal",
  7: "Bye",
  8: "Quarterfinal",
  9: "Quarterfinal",
  10: "Quarterfinal",
  11: "Semifinal",
  12: "Semifinal",
  13: "Final",
};

export const createBracket = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const sport: string =
        req.query.sport?.toString() ||
        (req.method === "POST" ? req.body.sport : "");

      if (!sport || typeof sport !== "string") {
        res
          .status(400)
          .json({ error: "Missing or invalid 'sport' parameter." });
        return;
      }

      const bracketRef = db.collection("brackets").doc(sport);

      const existingDoc = await bracketRef.get();
      if (existingDoc.exists) {
        res
          .status(409)
          .json({ error: `Bracket for '${sport}' already exists.` });
        return;
      }

      // also create the skeleton matches in match database at the same time

      // need to add id of match and id of next match to this
      const matches = Object.entries(matchRounds).map(
        ([bracket_placement, round]) => ({
          bracket_placement: Number(bracket_placement),
          round,
        })
      );

      await bracketRef.set({
        sport,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        matches,
      });

      res
        .status(200)
        .json({ message: `Bracket for '${sport}' created successfully.` });
    } catch (error) {
      console.error("Error creating bracket", error);
      res.status(500).send("Internal Server Error");
    }
  });
});
