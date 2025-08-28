import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

interface UserRow {
  username: string;
  college: string;
  points: number;
  correctPredictions: number;
}

export const getUserLeaderboard = functions.https.onRequest((req, res) =>
  corsHandler(req, res, async () => {
    const seasonId = (req.query.season as string) ?? "2025-2026";

    try {
      const seasonSnap = await db
        .collectionGroup("seasons")
        .where(admin.firestore.FieldPath.documentId(), "==", seasonId)
        .orderBy("points", "desc")
        .limit(10)
        .get();

      if (seasonSnap.empty) {
        res.status(404).send("No data for that season");
        return;
      }

      const rows: UserRow[] = await Promise.all(
        seasonSnap.docs.map(async (sDoc) => {
          const userRef = sDoc.ref.parent.parent!;      
          const user = (await userRef.get()).data() ?? {};
          const { points, correctPredictions } = sDoc.data();

          return {
            username: user.username ?? userRef.id,
            college: user.college ?? "N/A",
            points,
            correctPredictions,
          };
        })
      );

      res.status(200).json(rows);
    } catch (err: any) {
      console.error(err);
      res.status(500).send("Internal error");
    }
  })
);
