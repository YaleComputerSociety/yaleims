import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { Filter } from "firebase-admin/firestore";
import { Query } from "firebase-admin/firestore";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const getSchedulePaginated = functions.https.onRequest(
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        const { date, lastVisible, pageSize, college, sport } = req.query;

        if (!pageSize) {
          return res.status(400).send("Missing required parameters");
        }

        const pageSizeNum = parseInt(pageSize as string, 10);

        let query: Query = db.collection("matches").orderBy("timestamp", "asc");

        if (college) {
          query = query.where(
            Filter.or(
              Filter.where("home_college", "==", college),
              Filter.where("away_college", "==", college)
            )
          );
        }

        if (sport) {
          query = query.where("sport", "==", sport);
        }

        if (date) {
          const parsedDate = new Date(date as string);
          if (isNaN(parsedDate.getTime())) {
            return res.status(400).send("Invalid 'date' parameter");
          }
          query = query.where("timestamp", ">=", parsedDate);
        } else {
          const now = new Date();
          query = query.where("timestamp", ">=", now);
        }

        if (lastVisible) {
          const lastVisibleDoc = await db
            .collection("matches")
            .doc(lastVisible as string)
            .get();

          if (!lastVisibleDoc.exists) {
            return res.status(404).send("Invalid 'lastVisible' parameter");
          }

          query = query.startAfter(lastVisibleDoc);
        }

        query = query.limit(pageSizeNum + 1);

        const snapshot = await query.get();

        if (snapshot.empty) {
          return res.status(200).json({ matches: [], lastVisible: null });
        }

        const matches = snapshot.docs.slice(0, pageSizeNum).map((doc) => {
          const data = doc.data();
          return {
            home_college: data.home_college,
            away_college: data.away_college,
            sport: data.sport,
            home_college_score: data.home_college_score,
            away_college_score: data.away_college_score,
            winner: data.winner,
            timestamp:
              data.timestamp && data.timestamp.toDate
                ? data.timestamp.toDate().toISOString()
                : null, // Fallback if timestamp is missing or invalid
          };
        });

        const hasMoreMatches = snapshot.docs.length > pageSizeNum;
        const lastVisibleDocId = hasMoreMatches
          ? snapshot.docs[snapshot.docs.length - 2].id
          : null;

        return res
          .status(200)
          .json({ matches, lastVisible: lastVisibleDocId, hasMoreMatches });
      } catch (error) {
        console.error("Error fetching matches:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);
