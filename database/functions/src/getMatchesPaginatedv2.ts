import { Filter, OrderByDirection } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

/**
 * v2 – always queries a single season subcollection via Firestore.
 *
 * Required params:
 *   seasonId  – e.g. "2025-2026"
 *   pageSize  – number of results per page
 *   type      – "index" | "next" | "prev"
 *
 * Optional params:
 *   pageIndex    – (for type=index) defaults to 1
 *   lastVisible  – cursor doc id for type=next
 *   firstVisible – cursor doc id for type=prev
 *   sortOrder    – "asc" | "desc" (default "asc")
 *   college      – college abbreviation or "All"
 *   sport        – sport name or "All"
 *   scored       – "all" | "scored" | "unscored" (default "all")
 *   dateFrom     – ISO string, only return matches on or after this date
 *   dateTo       – ISO string, only return matches on or before this date
 *   paginate     – "true" | "false" (default "true"). When "false", returns
 *                  all matches for the season and ignores pageSize/type/cursors.
 */
export const getMatchesPaginatedv2 = functions.https.onRequest(
  { memory: "512MiB" },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        // ── parse params ──────────────────────────────────────────────
        const seasonId = req.query.seasonId as string;
        const pageSize = req.query.pageSize as string;
        const type = req.query.type as string; // "index" | "next" | "prev"
        const pageIndex = (req.query.pageIndex as string) || "1";
        const lastVisible = req.query.lastVisible as string;
        const firstVisible = req.query.firstVisible as string;
        const sortOrder = ((req.query.sortOrder as string) || "asc") as OrderByDirection;
        const college = req.query.college as string;
        const sport = req.query.sport as string;
        const scored = (req.query.scored as string) || "all"; // "all" | "scored" | "unscored"
        const dateFrom = req.query.dateFrom as string;
        const dateTo = req.query.dateTo as string;
        const paginate = (req.query.paginate as string) !== "false";

        // ── validate ──────────────────────────────────────────────────
        if (!seasonId)
          return res.status(400).send("Missing required parameter: seasonId");
        if (paginate) {
          if (!pageSize)
            return res.status(400).send("Missing required parameter: pageSize");
          if (!["next", "prev", "index"].includes(type))
            return res.status(400).send("Invalid or missing 'type' parameter");
        }
        if (!["asc", "desc"].includes(sortOrder))
          return res.status(400).send("Invalid 'sortOrder' parameter");
        if (!["all", "scored", "unscored"].includes(scored))
          return res.status(400).send("Invalid 'scored' parameter. Use 'all', 'scored', or 'unscored'.");

        const pageSizeNum = paginate ? parseInt(pageSize, 10) : 0;
        const pageIndexNum = parseInt(pageIndex, 10) || 1;

        // ── build query ───────────────────────────────────────────────
        const baseRef = db
          .collection("matches")
          .doc("seasons")
          .collection(seasonId);

        let query = baseRef.orderBy("timestamp", sortOrder);

        // college filter (OR on home/away)
        if (college && college !== "All") {
          query = query.where(
            Filter.or(
              Filter.where("home_college", "==", college),
              Filter.where("away_college", "==", college)
            )
          );
        }

        // sport filter
        if (sport && sport !== "All") {
          query = query.where("sport", "==", sport);
        }

        // scored / unscored filter
        if (scored === "scored") {
          query = query.where("winner", "!=", null);
        } else if (scored === "unscored") {
          query = query.where("winner", "==", null);
        }
        // "all" → no winner filter

        // date range filters
        if (dateFrom) {
          query = query.where("timestamp", ">=", new Date(dateFrom));
        }
        if (dateTo) {
          query = query.where("timestamp", "<=", new Date(dateTo));
        }

        // ── count total (for page indicator) ──────────────────────────
        let totalResults: number;
        let totalPages: number;
        if (paginate) {
          totalResults = (await query.count().get()).data().count;
          totalPages = Math.ceil(totalResults / pageSizeNum);

          // ── pagination ──────────────────────────────────────────────
          if (type === "next" && lastVisible) {
            const cursorDoc = await baseRef.doc(lastVisible).get();
            if (!cursorDoc.exists)
              return res.status(404).send("Last visible document not found");
            query = query.startAfter(cursorDoc).limit(pageSizeNum);
          } else if (type === "prev" && firstVisible) {
            const cursorDoc = await baseRef.doc(firstVisible).get();
            if (!cursorDoc.exists)
              return res.status(404).send("First visible document not found");
            query = query.endBefore(cursorDoc).limitToLast(pageSizeNum);
          } else {
            // type === "index"
            const offset = (pageIndexNum - 1) * pageSizeNum;
            query = query.offset(offset).limit(pageSizeNum);
          }
        } else {
          totalResults = 0;
          totalPages = 1;
        }

        // ── execute ───────────────────────────────────────────────────
        const snapshot = await query.get();
        if (snapshot.empty) {
          return res.status(200).json({
            matches: [],
            firstVisible: null,
            lastVisible: null,
            totalPages,
            totalResults,
          });
        }

        // ── map results ───────────────────────────────────────────────
        const matches = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            seasonId,
            ...data,
            timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
          };
        });

        if (!paginate) totalResults = matches.length;

        return res.status(200).json({
          matches,
          firstVisible: matches[0]?.id || null,
          lastVisible: matches[matches.length - 1]?.id || null,
          totalPages,
          totalResults,
        });
      } catch (error) {
        console.error("Error fetching matches:", error);
        return res.status(500).send("Internal Server Error");
      }
    });
  }
);
