import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { Filter, OrderByDirection, Query } from "firebase-admin/firestore";
import { JWT_SECRET, isValidDecodedToken } from "./helpers.js";
import jwt from "jsonwebtoken";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

export const getSchedulePaginatedv2 = functions.https.onRequest(
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        const authHeader = req.headers.authorization || ""
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({error: "No token provided"});
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!isValidDecodedToken(decoded)) {
            console.error("Invalid token structure");
            return res.status(401).json({error: "Invalid Token Structure"})
        }

        const { date, lastVisible, pageSize, college, sport, seasonId } = req.query;

        if (!seasonId) {
          return res.status(400).send("Missing required parameter: seasonId");
        }
        if (!pageSize) {
          return res.status(400).send("Missing required parameter: pageSize");
        }

        const pageSizeNum = parseInt(pageSize as string, 10);
        const baseRef = db
          .collection("matches")
          .doc("seasons")
          .collection(seasonId as string);

        let query: Query = baseRef.orderBy(
          "timestamp",
          "asc" as OrderByDirection
        );

        if (college && college !== "All") {
          query = query.where(
            Filter.or(
              Filter.where("home_college", "==", college),
              Filter.where("away_college", "==", college)
            )
          );
        }

        if (sport && sport !== "All") {
          query = query.where("sport", "==", sport);
        }

        if (date) {
          const parsedDate = new Date(date as string);
          if (isNaN(parsedDate.getTime())) {
            return res.status(400).send("Invalid 'date' parameter");
          }
          query = query.where("timestamp", ">=", parsedDate);
        } else {
          query = query.where("timestamp", ">=", new Date());
        }

        if (lastVisible) {
          const cursorDoc = await baseRef.doc(lastVisible as string).get();
          if (!cursorDoc.exists) {
            return res.status(404).send("Invalid 'lastVisible' parameter");
          }
          query = query.startAfter(cursorDoc);
        }

        query = query.limit(pageSizeNum + 1);
        const snapshot = await query.get();

        if (snapshot.empty) {
          return res
            .status(200)
            .json({ matches: [], lastVisible: null, hasMoreMatches: false });
        }

        const docs = snapshot.docs;
        const hasMoreMatches = docs.length > pageSizeNum;

        const pageDocs = docs.slice(0, pageSizeNum);
        const matches = pageDocs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id, 
            home_college: data.home_college,
            away_college: data.away_college,
            sport: data.sport,
            home_college_score: data.home_college_score,
            away_college_score: data.away_college_score,
            home_college_participants: data.home_college_participants,
            away_college_participants: data.away_college_participants,
            winner: data.winner,
            location: data.location,
            location_extra: data.location_extra,
            type: data.type,
            timestamp:
              data.timestamp && data.timestamp.toDate
                ? data.timestamp.toDate().toISOString()
                : null,
          };
        });

        const lastVisibleId = hasMoreMatches
          ? pageDocs[pageSizeNum - 1].id
          : null;

        return res.status(200).json({
          matches,
          lastVisible: lastVisibleId,
          hasMoreMatches,
        });
      } catch (error) {
        console.error("Error fetching matches:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);
