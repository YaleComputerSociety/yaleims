import { Filter, OrderByDirection } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import admin from "./firebaseAdmin.js";
import cors from "cors";

const corsHandler = cors({ origin: true });
const db = admin.firestore();

interface Odds {
  team1Win: number;
  team2Win: number;
  draw: number;
  forfeit: number;
}

function oddsCalculator(
  team1WinPercentage: number,
  team2WinPercentage: number,
  bettingVolume: { team1: number; team2: number; draw: number; forfeit: number },
  team1ForfeitRate: number,
  team2ForfeitRate: number
): Odds {
  const def = { team1Win: 0.35, team2Win: 0.35, draw: 0.1, forfeit: 0.2 };
  const total =
    bettingVolume.team1 +
    bettingVolume.team2 +
    bettingVolume.draw +
    bettingVolume.forfeit;
  const weight = total > 0 ? 1 : 0;
  const share = {
    team1: total ? bettingVolume.team1 / total : def.team1Win,
    team2: total ? bettingVolume.team2 / total : def.team2Win,
    draw: total ? bettingVolume.draw / total : def.draw,
    forfeit: total ? bettingVolume.forfeit / total : def.forfeit,
  };
  const pastW = 5;
  const rawDraw = 1 - team1WinPercentage - team2WinPercentage;
  const e1 = Math.exp(team1WinPercentage),
    e2 = Math.exp(team2WinPercentage),
    eD = Math.exp(rawDraw);
  const sum = e1 + e2 + eD;
  const n1 = e1 / sum,
    n2 = e2 / sum,
    nD = eD / sum;
  const remForfeit = Math.max(0.05, 1 - n1 - n2 - nD);
  const nF = Math.max(0.05, remForfeit - team1ForfeitRate - team2ForfeitRate);
  const mix = (perf: number, s: number) =>
    (perf * pastW + s * weight) / (pastW + weight || 1);
  const t1 = mix(n1, share.team1),
    t2 = mix(n2, share.team2),
    dr = mix(nD, share.draw),
    fr = mix(nF, share.forfeit),
    tot = t1 + t2 + dr + fr;
  return {
    team1Win: tot ? t1 / tot : def.team1Win,
    team2Win: tot ? t2 / tot : def.team2Win,
    draw: tot ? dr / tot : def.draw,
    forfeit: tot ? fr / tot : def.forfeit,
  };
}

export const getMatchesPaginatedv2 = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const college = req.query.college as string;
      const seasonId = req.query.seasonId as string;
      const pageIndex = (req.query.pageIndex as string) || "1";
      const pageSize = req.query.pageSize as string;
      const lastVisible = req.query.lastVisible as string;
      const firstVisible = req.query.firstVisible as string;
      const type = req.query.type as string;
      const sport = req.query.sport as string;
      const sortOrder = (req.query.sortOrder as string) || "desc";
      const date = req.query.date as string;

      if (!pageSize) return res.status(400).send("Missing required parameter: pageSize");
      if (!["next", "prev", "index"].includes(type))
        return res.status(400).send("Invalid or missing 'type' parameter");
      if (!["asc", "desc"].includes(sortOrder))
        return res.status(400).send("Invalid 'sortOrder' parameter");

      const pageSizeNum = parseInt(pageSize, 10);
      const pageIndexNum = parseInt(pageIndex, 10) || 1;

      const currentDate = new Date();
      const currentDateUTC = new Date(
        Date.UTC(
          currentDate.getUTCFullYear(),
          currentDate.getUTCMonth(),
          currentDate.getUTCDate()
        )
      );
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
        future: currentDateUTC,
      };

      const sortOrderValidated = sortOrder as OrderByDirection;

      const addOdds = (match: any, homeStats: any, awayStats: any) => {
        const vol = {
          team1: match.home_volume ?? 0,
          team2: match.away_volume ?? 0,
          draw: match.draw_volume ?? 0,
          forfeit: match.default_volume ?? 0,
        };
        const odds = oddsCalculator(
          (homeStats?.wins || 0) / (homeStats?.games || 1),
          (awayStats?.wins || 0) / (awayStats?.games || 1),
          vol,
          (homeStats?.forfeits || 0) / (homeStats?.games || 1),
          (awayStats?.forfeits || 0) / (awayStats?.games || 1)
        );
        return {
          ...match,
          default_odds: odds.forfeit,
          home_college_odds: odds.team1Win,
          away_college_odds: odds.team2Win,
          draw_odds: odds.draw,
        };
      };

      if (date === "future") {
        if (!seasonId)
          return res.status(400).send("Missing required parameter: seasonId");

        let baseRef = db.collection("matches").doc("seasons").collection(seasonId);
        let query = baseRef.orderBy("timestamp", sortOrderValidated);

        if (college && college !== "All") {
          query = query.where(
            Filter.or(
              Filter.where("home_college", "==", college),
              Filter.where("away_college", "==", college)
            )
          );
        }
        if (sport && sport !== "All") query = query.where("sport", "==", sport);

        query = query.where("timestamp", ">=", currentDate).where("winner", "==", null);

        const totalResults = (await query.count().get()).data().count;
        const totalPages = Math.ceil(totalResults / pageSizeNum);

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
        } else if (type === "index") {
          query = query.offset((pageIndexNum - 1) * pageSizeNum).limit(pageSizeNum);
        }

        const snapshot = await query.get();
        if (snapshot.empty)
          return res
            .status(200)
            .json({ matches: [], firstVisible: null, lastVisible: null, totalPages });

        const statsSnap = await db
          .collection("colleges")
          .doc("seasons")
          .collection(seasonId)
          .get();
        const statsMap = new Map<string, any>();
        statsSnap.forEach((d) => statsMap.set(d.id, d.data()));

        const matches = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            const matchBase = {
              id: doc.id,
              seasonId,
              ...data,
              timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
            };
            const homeStats = statsMap.get(data.home_college);
            const awayStats = statsMap.get(data.away_college);
            return addOdds(matchBase, homeStats, awayStats);
          })
          .filter((m) => m != null);

        return res.status(200).json({
          matches,
          firstVisible: matches[0]?.id || null,
          lastVisible: matches[matches.length - 1]?.id || null,
          totalPages,
        });
      }

      interface Flat {
        id: string;
        seasonId: string;
        data: any;
        ts: Date;
      }
      const seasonsRoot = db.collection("matches").doc("seasons");
      const seasonCols = await seasonsRoot.listCollections();
      const all: Flat[] = [];

      for (const col of seasonCols) {
        const snap = await col.get();
        snap.docs.forEach((d) => {
          const raw = d.data();
          const tsObj = raw.timestamp;
          const ts = tsObj?.toDate ? tsObj.toDate() : new Date(tsObj);
          all.push({ id: d.id, seasonId: col.id, data: raw, ts });
        });
      }

      const now = currentDate;
      let filtered = all.filter((m) => {
        if (date && date !== "All" && date !== "future") {
          if (!(date in dateFilters)) return false;
          const start = dateFilters[date as DateFilterKey];
          return m.ts >= start && m.ts < now && m.data.winner != null;
        }
        return m.ts < now && m.data.winner != null;
      });

      if (college && college !== "All") {
        filtered = filtered.filter(
          (m) => m.data.home_college === college || m.data.away_college === college
        );
      }
      if (sport && sport !== "All") {
        filtered = filtered.filter((m) => m.data.sport === sport);
      }

      filtered.sort((a, b) => {
        const ta = a.ts.getTime(),
          tb = b.ts.getTime();
        return sortOrder === "asc" ? ta - tb : tb - ta;
      });

      const totalResultsPast = filtered.length;
      const totalPagesPast = Math.ceil(totalResultsPast / pageSizeNum);

      let pageSlice: Flat[] = [];
      if (type === "next" && lastVisible) {
        const idx = filtered.findIndex((m) => m.id === lastVisible);
        const start = idx + 1;
        pageSlice = start < filtered.length ? filtered.slice(start, start + pageSizeNum) : [];
      } else if (type === "prev" && firstVisible) {
        const idx = filtered.findIndex((m) => m.id === firstVisible);
        const end = idx;
        if (end > 0) {
          const start = Math.max(0, end - pageSizeNum);
          pageSlice = filtered.slice(start, end);
        } else {
          pageSlice = [];
        }
      } else if (type === "index") {
        const start = (pageIndexNum - 1) * pageSizeNum;
        pageSlice = filtered.slice(start, start + pageSizeNum);
      }

      const neededSeasons = Array.from(new Set(pageSlice.map((m) => m.seasonId)));
      const statsMap = new Map<string, any>();
      for (const sid of neededSeasons) {
        const snap = await db
          .collection("colleges")
          .doc("seasons")
          .collection(sid)
          .get();
        snap.forEach((d) => statsMap.set(`${sid}-${d.id}`, d.data()));
      }

      const matches = pageSlice
        .map((row) => {
          const homeStats = statsMap.get(`${row.seasonId}-${row.data.home_college}`);
          const awayStats = statsMap.get(`${row.seasonId}-${row.data.away_college}`);
          if (!homeStats || !awayStats) {
            console.error(
              `Missing stats for ${row.seasonId}-${row.data.home_college} or ${row.seasonId}-${row.data.away_college}`
            );
            return null;
          }
          const baseMatch = {
            id: row.id,
            seasonId: row.seasonId,
            ...row.data,
            timestamp: row.ts.toISOString(),
          };
          return addOdds(baseMatch, homeStats, awayStats);
        })
        .filter((m) => m != null);

      return res.status(200).json({
        matches,
        firstVisible: matches[0]?.id || null,
        lastVisible: matches[matches.length - 1]?.id || null,
        totalPages: totalPagesPast,
      });
    } catch (error) {
      console.error("Error fetching matches:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});
