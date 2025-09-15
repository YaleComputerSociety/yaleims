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
      // 1) List user doc refs (no document reads billed here)
      const userRefs = await db.collection("users").listDocuments();

      if (userRefs.length === 0) {
        res.status(200).json([]);
        return;
      }

      // 2) Build refs to users/{uid}/seasons/{seasonId}
      const seasonRefs = userRefs.map(u => u.collection("seasons").doc(seasonId));

      // 3) Fetch all season docs and user docs in parallel
      const [seasonSnaps, userSnaps] = await Promise.all([
        db.getAll(...seasonRefs),
        db.getAll(...userRefs),
      ]);

      // 4) Build rows, guarding against missing docs or fields
      const rows: UserRow[] = seasonSnaps.map((sSnap, i) => {
        const uSnap = userSnaps[i];
        const user = uSnap.exists ? uSnap.data() as any : {};
        const sData = sSnap.exists ? (sSnap.data() as any) : {};

        return {
          username: user.username ?? uSnap.ref.id,
          college: user.college ?? "N/A",
          points: typeof sData.points === "number" ? sData.points : 0,
          correctPredictions:
            typeof sData.correctPredictions === "number" ? sData.correctPredictions : 0,
        };
      });

      // 5) Sort in memory and return top 10
      rows.sort(
        (a, b) =>
          (b.points - a.points) ||
          (b.correctPredictions - a.correctPredictions) ||
          a.username.localeCompare(b.username)
      );

      res.status(200).json(rows.slice(0, 10));
    } catch (err: any) {
      console.error(err);
      res.status(500).send("Internal error");
    }
  })
);
