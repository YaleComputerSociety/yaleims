#!/usr/bin/env npx ts-node
/**
 * Replay all scored matches for a season chronologically, using the
 * production elo_system + elo_odds_calculator functions.
 *
 * For each match:
 *   1. Calculate odds BEFORE updating Elo (captures pre-match state)
 *   2. Record predicted outcome vs actual outcome
 *   3. Update Elo + stats via updateEloRatings
 *
 * Prints accuracy stats at the end.
 *
 * Usage:
 *   GOOGLE_CLOUD_PROJECT=yims-125a2 node --loader ts-node/esm scripts/replayEloSeason.ts
 *   GOOGLE_CLOUD_PROJECT=yims-125a2 node lib/scripts/replayEloSeason.js
 */

import admin from "../firebaseAdmin.js";
import { updateEloRatings } from "../elo_system.js";
import { hybridOddsCalculator } from "../elo_odds_calculator.js";

const db = admin.firestore();

interface MatchPrediction {
  matchId: string;
  timestamp: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeWinOdds: number;
  awayWinOdds: number;
  drawOdds: number;
  predictedOutcome: string;
  actualWinner: string;
  homeScore: number;
  awayScore: number;
  matchType: string;
  correct: boolean;
  isForfeit: boolean;
  isDoubleForfeit: boolean;
}

async function replayEloSeason(season: string) {
  console.log(`\nReplaying season ${season}...\n`);

  const snap = await db
    .collection("matches")
    .doc("seasons")
    .collection(season)
    .orderBy("timestamp", "asc")
    .get();

  if (snap.empty) {
    console.log("No matches found.");
    return;
  }

  console.log(`Found ${snap.size} total matches.\n`);

  let processed = 0;
  let skipped = 0;
  const predictions: MatchPrediction[] = [];
  const errors: Array<{ id: string; error: string }> = [];
  let doubleForfeitCount = 0;
  let singleForfeitCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as any;

    const homeTeam: string | undefined = data.home_college;
    const awayTeam: string | undefined = data.away_college;
    const matchType: "Regular" | "Playoff" | "Final" | undefined = data.type;
    const ts: admin.firestore.Timestamp | undefined = data.timestamp;
    const homeScore: number = data.home_college_score ?? 0;
    const awayScore: number = data.away_college_score ?? 0;
    const matchSport: string | undefined = data.sport;
    const isForfeit: boolean = data.forfeit === true;
    const declaredWinner: string | undefined = data.winner;

    if (!homeTeam || !awayTeam || !matchSport || !matchType || !ts) {
      errors.push({ id: doc.id, error: "Missing required match fields" });
      continue;
    }

    // --- FORFEIT DETECTION (matches runExperiment.ts v1.1) ---
    let actualWinner: string;
    let forfeitingTeam: string | undefined;

    if (isForfeit) {
      // Case A: Double forfeit
      if (homeScore === 0 && awayScore === 0 && !declaredWinner) {
        doubleForfeitCount++;
        try {
          await updateEloRatings({
            season,
            homeTeam,
            awayTeam,
            sport: matchSport,
            winner: "Default",
            matchType,
            home_college_score: 0,
            away_college_score: 0,
            forfeitingTeam: undefined,
          });
          processed++;
        } catch (e: any) {
          errors.push({ id: doc.id, error: String(e?.message ?? e) });
        }
        continue; // voided — no odds, no prediction
      }

      singleForfeitCount++;

      // Case B: Single forfeit with declared winner
      if (declaredWinner) {
        actualWinner = declaredWinner;
        forfeitingTeam = declaredWinner === homeTeam ? awayTeam : homeTeam;
      } else {
        // Case C: Infer from scores
        if (homeScore === 0 && awayScore > 0) {
          forfeitingTeam = homeTeam;
          actualWinner = awayTeam;
        } else if (awayScore === 0 && homeScore > 0) {
          forfeitingTeam = awayTeam;
          actualWinner = homeTeam;
        } else {
          forfeitingTeam = homeScore > awayScore ? awayTeam : homeTeam;
          actualWinner = homeScore > awayScore ? homeTeam : awayTeam;
        }
      }

      // Calculate odds before updating
      try {
        const odds = await hybridOddsCalculator(homeTeam, awayTeam, matchSport, season);

        const maxOdds = Math.max(odds.team1Win, odds.team2Win, odds.draw);
        let predictedOutcome: string;
        if (maxOdds === odds.team1Win) predictedOutcome = homeTeam;
        else if (maxOdds === odds.team2Win) predictedOutcome = awayTeam;
        else predictedOutcome = "Draw";

        const correct = predictedOutcome === actualWinner;

        predictions.push({
          matchId: doc.id,
          timestamp: ts.toDate().toISOString(),
          sport: matchSport,
          homeTeam,
          awayTeam,
          homeWinOdds: odds.team1Win,
          awayWinOdds: odds.team2Win,
          drawOdds: odds.draw,
          predictedOutcome,
          actualWinner,
          homeScore,
          awayScore,
          matchType,
          correct,
          isForfeit: true,
          isDoubleForfeit: false,
        });
      } catch (oddsErr: any) {
        console.warn(`  [WARN] Odds failed for forfeit ${doc.id}: ${oddsErr.message}`);
      }

      try {
        await updateEloRatings({
          season,
          homeTeam,
          awayTeam,
          sport: matchSport,
          winner: "Default",
          matchType,
          home_college_score: homeScore,
          away_college_score: awayScore,
          forfeitingTeam,
        });
        processed++;
      } catch (e: any) {
        errors.push({ id: doc.id, error: String(e?.message ?? e) });
      }
      continue;
    }

    // --- REGULAR MATCH ---
    if (!declaredWinner) {
      skipped++;
      continue;
    }

    actualWinner = declaredWinner;

    try {
      const odds = await hybridOddsCalculator(homeTeam, awayTeam, matchSport, season);

      const maxOdds = Math.max(odds.team1Win, odds.team2Win, odds.draw);
      let predictedOutcome: string;
      if (maxOdds === odds.team1Win) predictedOutcome = homeTeam;
      else if (maxOdds === odds.team2Win) predictedOutcome = awayTeam;
      else predictedOutcome = "Draw";

      const correct = predictedOutcome === actualWinner;

      predictions.push({
        matchId: doc.id,
        timestamp: ts.toDate().toISOString(),
        sport: matchSport,
        homeTeam,
        awayTeam,
        homeWinOdds: odds.team1Win,
        awayWinOdds: odds.team2Win,
        drawOdds: odds.draw,
        predictedOutcome,
        actualWinner,
        homeScore,
        awayScore,
        matchType,
        correct,
        isForfeit: false,
        isDoubleForfeit: false,
      });
    } catch (oddsErr: any) {
      console.warn(`  [WARN] Odds failed for ${doc.id}: ${oddsErr.message}`);
    }

    try {
      await updateEloRatings({
        season,
        homeTeam,
        awayTeam,
        sport: matchSport,
        winner: actualWinner,
        matchType,
        home_college_score: homeScore,
        away_college_score: awayScore,
      });
      processed++;
    } catch (e: any) {
      errors.push({ id: doc.id, error: String(e?.message ?? e) });
    }

    // Progress
    if (processed % 50 === 0) {
      console.log(`  Processed ${processed} matches...`);
    }
  }

  // =========================================================================
  // RESULTS
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("SEASON REPLAY RESULTS");
  console.log("=".repeat(70));

  console.log(`\nMatches processed: ${processed}`);
  console.log(`Matches skipped (unscored): ${skipped}`);
  console.log(`Double forfeits (voided): ${doubleForfeitCount}`);
  console.log(`Single forfeits: ${singleForfeitCount}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const e of errors.slice(0, 10)) {
      console.log(`  ${e.id}: ${e.error}`);
    }
    if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more`);
  }

  // --- PREDICTION ACCURACY ---
  const total = predictions.length;
  const correctCount = predictions.filter(p => p.correct).length;
  const accuracy = total > 0 ? correctCount / total : 0;

  console.log("\n" + "-".repeat(70));
  console.log("PREDICTION ACCURACY");
  console.log("-".repeat(70));
  console.log(`Total predictions: ${total}`);
  console.log(`Correct: ${correctCount}`);
  console.log(`Overall accuracy: ${(accuracy * 100).toFixed(2)}%`);

  // Per-outcome breakdown
  const homeWins = predictions.filter(p => p.actualWinner === p.homeTeam);
  const awayWins = predictions.filter(p => p.actualWinner === p.awayTeam);
  const draws = predictions.filter(p => p.actualWinner === "Draw");

  const homeCorrect = homeWins.filter(p => p.correct).length;
  const awayCorrect = awayWins.filter(p => p.correct).length;
  const drawCorrect = draws.filter(p => p.correct).length;

  console.log(`\nHome Wins:  ${homeCorrect}/${homeWins.length} correct (${homeWins.length > 0 ? (homeCorrect / homeWins.length * 100).toFixed(1) : "N/A"}%)`);
  console.log(`Away Wins:  ${awayCorrect}/${awayWins.length} correct (${awayWins.length > 0 ? (awayCorrect / awayWins.length * 100).toFixed(1) : "N/A"}%)`);
  console.log(`Draws:      ${drawCorrect}/${draws.length} correct (${draws.length > 0 ? (drawCorrect / draws.length * 100).toFixed(1) : "N/A"}%)`);

  // Forfeit vs regular accuracy
  const forfeitPreds = predictions.filter(p => p.isForfeit);
  const regularPreds = predictions.filter(p => !p.isForfeit);
  const forfeitCorrect = forfeitPreds.filter(p => p.correct).length;
  const regularCorrect = regularPreds.filter(p => p.correct).length;

  console.log(`\nForfeit matches: ${forfeitCorrect}/${forfeitPreds.length} correct (${forfeitPreds.length > 0 ? (forfeitCorrect / forfeitPreds.length * 100).toFixed(1) : "N/A"}%)`);
  console.log(`Regular matches: ${regularCorrect}/${regularPreds.length} correct (${regularPreds.length > 0 ? (regularCorrect / regularPreds.length * 100).toFixed(1) : "N/A"}%)`);

  // --- BY SPORT ---
  console.log("\n" + "-".repeat(70));
  console.log("ACCURACY BY SPORT");
  console.log("-".repeat(70));

  const sportMap = new Map<string, MatchPrediction[]>();
  for (const p of predictions) {
    if (!sportMap.has(p.sport)) sportMap.set(p.sport, []);
    sportMap.get(p.sport)!.push(p);
  }

  const sportResults = Array.from(sportMap.entries())
    .map(([sport, preds]) => ({
      sport,
      total: preds.length,
      correct: preds.filter(p => p.correct).length,
      accuracy: preds.filter(p => p.correct).length / preds.length,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  console.log("Sport".padEnd(20) + "Matches".padEnd(10) + "Correct".padEnd(10) + "Accuracy");
  console.log("-".repeat(55));
  for (const s of sportResults) {
    console.log(
      s.sport.padEnd(20) +
      s.total.toString().padEnd(10) +
      s.correct.toString().padEnd(10) +
      `${(s.accuracy * 100).toFixed(1)}%`
    );
  }

  // --- CONFUSION MATRIX ---
  console.log("\n" + "-".repeat(70));
  console.log("CONFUSION MATRIX (Actual \\ Predicted)");
  console.log("-".repeat(70));

  const cm = { homeWin: { homeWin: 0, awayWin: 0, draw: 0 }, awayWin: { homeWin: 0, awayWin: 0, draw: 0 }, draw: { homeWin: 0, awayWin: 0, draw: 0 } };
  for (const p of predictions) {
    const actual = p.actualWinner === p.homeTeam ? "homeWin" : p.actualWinner === p.awayTeam ? "awayWin" : "draw";
    const predicted = p.predictedOutcome === p.homeTeam ? "homeWin" : p.predictedOutcome === p.awayTeam ? "awayWin" : "draw";
    cm[actual as keyof typeof cm][predicted as keyof typeof cm.homeWin]++;
  }

  const col = 12;
  console.log("".padEnd(14) + "Home Win".padEnd(col) + "Away Win".padEnd(col) + "Draw".padEnd(col));
  console.log("-".repeat(14 + col * 3));
  console.log("Home Win".padEnd(14) + cm.homeWin.homeWin.toString().padEnd(col) + cm.homeWin.awayWin.toString().padEnd(col) + cm.homeWin.draw.toString().padEnd(col));
  console.log("Away Win".padEnd(14) + cm.awayWin.homeWin.toString().padEnd(col) + cm.awayWin.awayWin.toString().padEnd(col) + cm.awayWin.draw.toString().padEnd(col));
  console.log("Draw".padEnd(14) + cm.draw.homeWin.toString().padEnd(col) + cm.draw.awayWin.toString().padEnd(col) + cm.draw.draw.toString().padEnd(col));

  // --- ACCURACY OVER TIME ---
  console.log("\n" + "-".repeat(70));
  console.log("ACCURACY OVER TIME (season progression)");
  console.log("-".repeat(70));

  const sorted = [...predictions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const chunkSize = Math.ceil(sorted.length / 5);
  console.log("Period".padEnd(12) + "Matches".padEnd(15) + "Correct".padEnd(10) + "Accuracy");
  console.log("-".repeat(50));
  for (let i = 0; i < 5; i++) {
    const start = i * chunkSize;
    const end = Math.min((i + 1) * chunkSize, sorted.length);
    const chunk = sorted.slice(start, end);
    if (chunk.length === 0) continue;
    const c = chunk.filter(p => p.correct).length;
    console.log(
      `Period ${i + 1}`.padEnd(12) +
      `${start + 1}-${end}`.padEnd(15) +
      c.toString().padEnd(10) +
      `${(c / chunk.length * 100).toFixed(1)}%`
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log("Done.");
}

// --- RUN ---
const season = process.argv[2] || "2025-2026";
replayEloSeason(season)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
