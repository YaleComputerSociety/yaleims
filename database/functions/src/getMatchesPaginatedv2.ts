import { Filter, OrderByDirection } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";
import { oddsCalculator } from "./helpers.js";

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
 */
export const getMatchesPaginatedv2 = functions.https.onRequest(
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

        // ── validate ──────────────────────────────────────────────────
        if (!seasonId)
          return res.status(400).send("Missing required parameter: seasonId");
        if (!pageSize)
          return res.status(400).send("Missing required parameter: pageSize");
        if (!["next", "prev", "index"].includes(type))
          return res.status(400).send("Invalid or missing 'type' parameter");
        if (!["asc", "desc"].includes(sortOrder))
          return res.status(400).send("Invalid 'sortOrder' parameter");
        if (!["all", "scored", "unscored"].includes(scored))
          return res.status(400).send("Invalid 'scored' parameter. Use 'all', 'scored', or 'unscored'.");

        const pageSizeNum = parseInt(pageSize, 10);
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
        const totalResults = (await query.count().get()).data().count;
        const totalPages = Math.ceil(totalResults / pageSizeNum);

        // ── pagination ────────────────────────────────────────────────
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

        // ── fetch college stats for odds calculation ──────────────────
        const statsSnap = await db
          .collection("colleges")
          .doc("seasons")
          .collection(seasonId)
          .get();
        const statsMap = new Map<string, any>();
        statsSnap.forEach((d) => statsMap.set(d.id, d.data()));

        // ── map results ───────────────────────────────────────────────
        const matches = snapshot.docs.map((doc) => {
          const data = doc.data();
          const matchBase = {
            id: doc.id,
            seasonId,
            ...data,
            timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
          };

          const homeStats = statsMap.get(data.home_college);
          const awayStats = statsMap.get(data.away_college);

          if (!homeStats || !awayStats) return matchBase;

          const vol = {
            team1: data.home_volume ?? 0,
            team2: data.away_volume ?? 0,
            draw: data.draw_volume ?? 0,
            forfeit: data.default_volume ?? 0,
          };
          const odds = oddsCalculator(
            (homeStats.wins || 0) / (homeStats.games || 1),
            (awayStats.wins || 0) / (awayStats.games || 1),
            vol,
            (homeStats.forfeits || 0) / (homeStats.games || 1),
            (awayStats.forfeits || 0) / (awayStats.games || 1)
          );

          return {
            ...matchBase,
            default_odds: odds.forfeit,
            home_college_odds: odds.team1Win,
            away_college_odds: odds.team2Win,
            draw_odds: odds.draw,
          };
        });

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
