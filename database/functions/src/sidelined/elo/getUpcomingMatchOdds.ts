import * as functions from "firebase-functions";
import admin from "../../firebaseAdmin.js";
import { hybridOddsCalculator } from "./elo_odds_calculator.js";

const db = admin.firestore();

/**
 * HTTP function to get odds for all unscored matches in a season.
 *
 * Request body:
 * - season: string (e.g., "2025-2026") — REQUIRED
 * - sport: string (optional) — if provided, only get matches of this sport
 * - limit: number (optional) — limit number of matches returned
 *
 * Behavior:
 * - Reads `/matches/seasons/{season}` where `winner` is null (not yet scored).
 * - Orders by `timestamp` ascending (upcoming matches first).
 * - For each match, calculates odds using current Elo ratings.
 * - Returns: { success, matches: [{matchId, odds, details}...], csv }
 */
export const getUpcomingMatchOdds = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { season, sport, limit } = req.body ?? {};
    if (!season || typeof season !== "string") {
      res.status(400).json({ error: "Missing required field 'season'" });
      return;
    }

    let q = db
      .collection("matches")
      .doc("seasons")
      .collection(season)
      .where("winner", "==", null)
      .orderBy("timestamp", "asc");

    if (sport && typeof sport === "string") {
      q = q.where("sport", "==", sport);
    }

    if (limit && typeof limit === "number" && limit > 0) {
      q = q.limit(limit);
    }

    const snap = await q.get();
    if (snap.empty) {
      res.status(200).json({ 
        success: true, 
        matches: [], 
        csv: "matchId,timestamp,sport,homeTeam,awayTeam,homeWinOdds,awayWinOdds,drawOdds,homeWinML,awayWinML,drawML,matchType\n",
        count: 0 
      });
      return;
    }

    const matches: Array<any> = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const doc of snap.docs) {
      const data = doc.data() as any;

      const homeTeam: string | undefined = data.home_college;
      const awayTeam: string | undefined = data.away_college;
      const matchType: "Regular" | "Playoff" | "Final" | undefined = data.type;
      const ts: admin.firestore.Timestamp | undefined = data.timestamp;
      const matchSport: string | undefined = data.sport;

      // Skip matches missing required fields or with TBD teams
      if (!homeTeam || !awayTeam || !matchSport || !matchType || !ts) {
        errors.push({ id: doc.id, error: "Missing required match fields" });
        continue;
      }

      // Skip if teams are still TBD
      if (homeTeam === "TBD" || awayTeam === "TBD") {
        continue;
      }

      try {
        const odds = await hybridOddsCalculator(
          homeTeam,
          awayTeam,
          matchSport,
          season
        );

        // Convert to moneyline
        const toML = (p: number): number => {
          const probability = Math.min(Math.max(p, 0.0001), 0.9999);
          if (probability >= 0.5) {
            return Math.round((-100 * probability) / (1 - probability));
          }
          return Math.round((100 * (1 - probability)) / probability);
        };

        matches.push({
          matchId: doc.id,
          timestamp: ts.toDate().toISOString(),
          sport: matchSport,
          homeTeam,
          awayTeam,
          homeWinOdds: odds.team1Win,
          awayWinOdds: odds.team2Win,
          drawOdds: odds.draw,
          homeWinML: toML(odds.team1Win),
          awayWinML: toML(odds.team2Win),
          drawML: toML(odds.draw),
          matchType,
          location: data.location,
          division: data.division,
        });
      } catch (oddsErr: any) {
        errors.push({ id: doc.id, error: String(oddsErr?.message ?? oddsErr) });
      }
    }

    // Convert to CSV format
    let csvContent = "matchId,timestamp,sport,homeTeam,awayTeam,homeWinOdds,awayWinOdds,drawOdds,homeWinML,awayWinML,drawML,matchType\n";
    for (const row of matches) {
      csvContent += `${row.matchId},${row.timestamp},${row.sport},${row.homeTeam},${row.awayTeam},${row.homeWinOdds},${row.awayWinOdds},${row.drawOdds},${row.homeWinML},${row.awayWinML},${row.drawML},${row.matchType}\n`;
    }

    res.status(200).json({ 
      success: true, 
      matches, 
      csv: csvContent,
      count: matches.length,
      errors: errors.length > 0 ? errors : undefined
    });
    return;
  } catch (err: any) {
    console.error("getUpcomingMatchOdds error", err);
    res.status(500).json({ success: false, error: String(err?.message ?? err) });
    return;
  }
});
