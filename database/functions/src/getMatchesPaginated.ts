import { Filter, OrderByDirection } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });

const db = admin.firestore();

export const getMatchesPaginated = functions.https.onRequest(
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        const college = req.query.college as string;
        const pageIndex = req.query.pageIndex as string;
        const pageSize = req.query.pageSize as string;
        const lastVisible = req.query.lastVisible as string;
        const type = req.query.type as string;
        const firstVisible = req.query.firstVisible as string;
        const sport = req.query.sport as string;
        const sortOrder = (req.query.sortOrder as string) || "desc";
        const date = req.query.date as string;

        if (!pageSize) {
          return res.status(400).send("Missing required parameters");
        }

        const pageSizeNum = parseInt(pageSize as string, 10);
        const pageIndexNum = parseInt(pageIndex as string, 10);
        if (!["asc", "desc"].includes(sortOrder)) {
          return res.status(400).send("Invalid 'sortOrder' parameter");
        }

        const currentDate = new Date();
        type DateFilterKey =
          | "today"
          | "yesterday"
          | "last7days"
          | "last30days"
          | "last60days"
          | "future";

        const dateFilters: Record<DateFilterKey, Date> = {
          today: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate()
          ),
          yesterday: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - 1
          ),
          last7days: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - 7
          ),
          last30days: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - 30
          ),
          last60days: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() - 60
          ),
          future: currentDate,
        };

        const sortOrderValidated = sortOrder as OrderByDirection;
        let query = db
          .collection("matches")
          .orderBy("timestamp", sortOrderValidated);

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

        // Handle different date filters
        if (date === "future") {
          // Future matches: timestamp >= current date, no winner yet
          query = query
            .where("timestamp", ">=", currentDate)
            .where("winner", "==", null);
        } else if (date && date !== "All") {
          if (!(date in dateFilters)) {
            return res.status(400).send("Invalid date filter");
          }

          const startDate = dateFilters[date as keyof typeof dateFilters];
          query = query
            .where("timestamp", ">=", startDate)
            .where("winner", "!=", null);
        } else {
          // Default: past matches with winners
          query = query
            .where("timestamp", "<", currentDate)
            .where("winner", "!=", null);
        }

        const totalResults = (await query.count().get()).data().count;
        const totalPages = Math.ceil(totalResults / pageSizeNum);

        // Handle pagination based on type
        if (type === "next" && lastVisible) {
          const lastVisibleDoc = await db
            .collection("matches")
            .doc(lastVisible as string)
            .get();
          if (!lastVisibleDoc.exists)
            return res.status(404).send("Last visible document not found");
          query = query.startAfter(lastVisibleDoc).limit(pageSizeNum);
        } else if (type === "prev" && firstVisible) {
          const firstVisibleDoc = await db
            .collection("matches")
            .doc(firstVisible as string)
            .get();
          if (!firstVisibleDoc.exists)
            return res.status(404).send("First visible document not found");
          query = query.endBefore(firstVisibleDoc).limitToLast(pageSizeNum);
        } else if (type === "index" && pageIndexNum >= 1) {
          query = query
            .offset((pageIndexNum - 1) * pageSizeNum)
            .limit(pageSizeNum);
        } else {
          return res.status(400).send("Invalid or missing 'type' parameter");
        }

        const snapshot = await query.get();
        if (snapshot.empty) {
          return res.status(200).json({
            matches: [],
            lastVisible: null,
            firstVisible: null,
            totalPages,
          });
        }

        const matches = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
        }));

        return res.status(200).json({
          matches,
          lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
          firstVisible: snapshot.docs[0]?.id || null,
          totalPages,
        });
      } catch (error) {
        console.error("Error fetching matches:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);
