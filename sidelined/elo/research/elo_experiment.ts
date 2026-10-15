// elo_experiment.ts
// -----------------------------------------------------------------------------
// PURPOSE
// Run experiments with different tunable constants for Elo prediction.
// Processes matches chronologically, keeps state in memory (no DB updates),
// and outputs CSV with predictions vs actual outcomes.
// -----------------------------------------------------------------------------

import * as functions from "firebase-functions";
import admin from "../firebaseAdmin.js";
import * as fs from "fs";
import * as path from "path";

const db = admin.firestore();

// -----------------------------------------------------------------------------
// TUNABLE PARAMETERS INTERFACE
// -----------------------------------------------------------------------------
export interface TunableParams {
  // Elo calculation params (from elo_system.ts)
  initialElo: number;
  baseK_Regular: number;
  baseK_Playoff: number;
  baseK_Final: number;
  eloScalingFactor: number;
  
  // Per-sport volatility modifiers
  sportModifiers: Record<string, number>;
  defaultSportModifier: number;
  
  // Draw probability params (from elo_system.ts)
  drawDmax: number;
  drawK: number;
  
  // Forfeit tipping params (v1.1)
  W_forfeit: number;
  
  // Market blending params
  V_threshold: number;
}

// Default parameters matching v1.1 optimized implementation
export const DEFAULT_PARAMS: TunableParams = {
  initialElo: 850,
  baseK_Regular: 24,
  baseK_Playoff: 36,
  baseK_Final: 48,
  eloScalingFactor: 275,
  sportModifiers: {},
  defaultSportModifier: 0.9,
  drawDmax: 0.12,
  drawK: 0.0008,
  W_forfeit: 0.10,
  V_threshold: 100,
};

// -----------------------------------------------------------------------------
// IN-MEMORY STATE STRUCTURES
// -----------------------------------------------------------------------------
interface TeamStats {
  elo_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  defaults: number;
  total_scored: number;
  total_conceded: number;
  form: string[];
}

interface SportStats {
  matches_played: number;
  draws: number;
  defaults: number;
  total_points: number;
  total_score_diff: number;
}

type ResultLetter = "W" | "L" | "D" | "F";

// -----------------------------------------------------------------------------
// IN-MEMORY ELO SIMULATOR
// -----------------------------------------------------------------------------
class EloSimulator {
  private params: TunableParams;
  // Map: sport -> college -> TeamStats
  private teamStats: Map<string, Map<string, TeamStats>> = new Map();
  // Map: sport -> SportStats
  private sportStats: Map<string, SportStats> = new Map();

  constructor(params: TunableParams) {
    this.params = params;
  }

  private getDefaultTeamStats(): TeamStats {
    return {
      elo_rating: this.params.initialElo,
      matches_played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      defaults: 0,
      total_scored: 0,
      total_conceded: 0,
      form: [],
    };
  }

  private getDefaultSportStats(): SportStats {
    return {
      matches_played: 0,
      draws: 0,
      defaults: 0,
      total_points: 0,
      total_score_diff: 0,
    };
  }

  private getTeamStats(sport: string, college: string): TeamStats {
    if (!this.teamStats.has(sport)) {
      this.teamStats.set(sport, new Map());
    }
    const sportTeams = this.teamStats.get(sport)!;
    if (!sportTeams.has(college)) {
      sportTeams.set(college, this.getDefaultTeamStats());
    }
    return sportTeams.get(college)!;
  }

  private getSportStats(sport: string): SportStats {
    if (!this.sportStats.has(sport)) {
      this.sportStats.set(sport, this.getDefaultSportStats());
    }
    return this.sportStats.get(sport)!;
  }

  private nextForm(prev: string[], letter: ResultLetter): string[] {
    const arr = [...prev];
    arr.push(letter);
    if (arr.length > 5) arr.splice(0, arr.length - 5);
    return arr;
  }

  private getSportModifier(sport: string): number {
    return this.params.sportModifiers[sport] ?? this.params.defaultSportModifier;
  }

  // Get Elo win probabilities using current in-memory state
  getEloWinProbabilities(
    homeTeam: string,
    awayTeam: string,
    sport: string
  ): { PHome: number; PDraw: number; PAway: number } {
    const homeStats = this.getTeamStats(sport, homeTeam);
    const awayStats = this.getTeamStats(sport, awayTeam);
    const homeRating = homeStats.elo_rating;
    const awayRating = awayStats.elo_rating;

    const { drawDmax, drawK, eloScalingFactor } = this.params;

    // Standard Elo expected score
    const Ea = 1 / (1 + 10 ** ((awayRating - homeRating) / eloScalingFactor));
    const diff = Math.abs(awayRating - homeRating);

    const PDraw = drawDmax * Math.exp(-drawK * diff);
    const PHome = (1 - PDraw) * Ea;
    const PAway = (1 - PDraw) * (1 - Ea);

    return { PHome, PDraw, PAway };
  }

  // Calculate forfeit tipping factor (Delta_F) using in-memory state
  // Positive Delta_F means away forfeits more -> boost home odds
  calculateForfeitTipping(homeTeam: string, awayTeam: string, sport: string): number {
    const homeStats = this.getTeamStats(sport, homeTeam);
    const awayStats = this.getTeamStats(sport, awayTeam);

    const LAPLACE_THRESHOLD = 5;
    const getForfeitRate = (forfeits: number, matches: number): number => {
      if (matches < LAPLACE_THRESHOLD) {
        return (Math.max(0, forfeits) + 1) / (Math.max(0, matches) + 2);
      }
      return matches > 0 ? Math.max(0, forfeits) / matches : 0.5;
    };

    const homeRate = getForfeitRate(homeStats.defaults, homeStats.matches_played);
    const awayRate = getForfeitRate(awayStats.defaults, awayStats.matches_played);

    return awayRate - homeRate;
  }

  // Calculate hybrid odds (v1.1: 3-outcome with forfeit tipping)
  calculateOdds(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    bettingVolume: { team1?: number; team2?: number; draw?: number; forfeit?: number }
  ): { team1Win: number; team2Win: number; draw: number } {
    // STEP 1: Base Elo probabilities
    let { PHome: eloHome, PDraw: eloDraw, PAway: eloAway } =
      this.getEloWinProbabilities(homeTeam, awayTeam, sport);

    // STEP 2: Forfeit tipping (Delta_F adjusts home/away)
    const { W_forfeit, V_threshold } = this.params;
    const deltaF = this.calculateForfeitTipping(homeTeam, awayTeam, sport);

    let modelHome = eloHome + W_forfeit * deltaF;
    let modelAway = eloAway - W_forfeit * deltaF;
    let modelDraw = eloDraw;

    // Clamp and renormalize
    modelHome = Math.max(0, modelHome);
    modelAway = Math.max(0, modelAway);
    modelDraw = Math.max(0, modelDraw);
    const modelSum = modelHome + modelAway + modelDraw;
    if (modelSum > 0) {
      modelHome /= modelSum;
      modelAway /= modelSum;
      modelDraw /= modelSum;
    }

    // STEP 3: Market sentiment (3 outcomes only, forfeit ignored)
    const v1 = bettingVolume.team1 ?? 0;
    const v2 = bettingVolume.team2 ?? 0;
    const vD = bettingVolume.draw ?? 0;
    const totalBettingVolume = v1 + v2 + vD;

    let volProbs = { team1Win: 0.33, team2Win: 0.33, draw: 0.34 };
    if (totalBettingVolume > 0) {
      volProbs = {
        team1Win: v1 / totalBettingVolume,
        team2Win: v2 / totalBettingVolume,
        draw: vD / totalBettingVolume,
      };
    }

    // STEP 4: Phased market weighting
    const volWeight = Math.min(1.0, totalBettingVolume / V_threshold);

    // Softmax the market probabilities
    const e1 = Math.exp(volProbs.team1Win);
    const e2 = Math.exp(volProbs.team2Win);
    const eD = Math.exp(volProbs.draw);
    const s = e1 + e2 + eD;

    const marketHome = e1 / s;
    const marketAway = e2 / s;
    const marketDraw = eD / s;

    // STEP 5: Blend model and market
    const finalHome = (1 - volWeight) * modelHome + volWeight * marketHome;
    const finalAway = (1 - volWeight) * modelAway + volWeight * marketAway;
    const finalDraw = (1 - volWeight) * modelDraw + volWeight * marketDraw;

    // Normalize
    const total = finalHome + finalAway + finalDraw;
    if (total <= 0) {
      return { team1Win: 0.45, team2Win: 0.45, draw: 0.10 };
    }

    return {
      team1Win: finalHome / total,
      team2Win: finalAway / total,
      draw: finalDraw / total,
    };
  }

  // Calculate new ratings (in-memory version)
  private calculateNewRatings(
    homeRating: number,
    awayRating: number,
    winner: string,
    homeTeam: string,
    awayTeam: string,
    matchType: "Regular" | "Playoff" | "Final",
    sport: string
  ): { newHomeRating: number; newAwayRating: number } {
    const { baseK_Regular, baseK_Playoff, baseK_Final, eloScalingFactor } = this.params;

    const baseKByType: Record<string, number> = {
      Regular: baseK_Regular,
      Playoff: baseK_Playoff,
      Final: baseK_Final,
    };

    const sportModifier = this.getSportModifier(sport);
    const K = (baseKByType[matchType] ?? baseK_Regular) * sportModifier;

    let homeActual: number;
    if (winner === "Draw") {
      homeActual = 0.5;
    } else if (winner === homeTeam) {
      homeActual = 1;
    } else {
      homeActual = 0;
    }
    const awayActual = 1 - homeActual;

    const homeExpected = 1 / (1 + 10 ** ((awayRating - homeRating) / eloScalingFactor));
    const awayExpected = 1 - homeExpected;

    return {
      newHomeRating: Math.round(homeRating + K * (homeActual - homeExpected)),
      newAwayRating: Math.round(awayRating + K * (awayActual - awayExpected)),
    };
  }

  // Update state after a match (in-memory only)
  updateAfterMatch(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    winner: string,
    matchType: "Regular" | "Playoff" | "Final",
    homeScore: number,
    awayScore: number,
    forfeitingTeam?: string
  ): void {
    const homeStats = this.getTeamStats(sport, homeTeam);
    const awayStats = this.getTeamStats(sport, awayTeam);
    const sportData = this.getSportStats(sport);

    // Update sport stats
    sportData.matches_played += 1;
    sportData.draws += winner === "Draw" ? 1 : 0;
    sportData.defaults += winner === "Default" ? 1 : 0;
    sportData.total_points += homeScore + awayScore;
    sportData.total_score_diff += Math.abs(homeScore - awayScore);

    if (winner === "Default") {
      // Forfeit case
      const forfeiter =
        forfeitingTeam && [homeTeam, awayTeam].includes(forfeitingTeam)
          ? forfeitingTeam
          : undefined;

      homeStats.matches_played += 1;
      homeStats.defaults += forfeiter === homeTeam ? 1 : 0;
      homeStats.wins += forfeiter === homeTeam ? 0 : 1;
      homeStats.form = this.nextForm(homeStats.form, forfeiter === homeTeam ? "F" : "W");
      homeStats.total_scored += homeScore;
      homeStats.total_conceded += awayScore;

      awayStats.matches_played += 1;
      awayStats.defaults += forfeiter === awayTeam ? 1 : 0;
      awayStats.wins += forfeiter === awayTeam ? 0 : 1;
      awayStats.form = this.nextForm(awayStats.form, forfeiter === awayTeam ? "F" : "W");
      awayStats.total_scored += awayScore;
      awayStats.total_conceded += homeScore;

      // No Elo update on forfeits
      return;
    }

    // Normal match
    const { newHomeRating, newAwayRating } = this.calculateNewRatings(
      homeStats.elo_rating,
      awayStats.elo_rating,
      winner,
      homeTeam,
      awayTeam,
      matchType,
      sport
    );

    const homeLetter: ResultLetter =
      winner === "Draw" ? "D" : winner === homeTeam ? "W" : "L";
    const awayLetter: ResultLetter =
      winner === "Draw" ? "D" : winner === awayTeam ? "W" : "L";

    homeStats.elo_rating = newHomeRating;
    homeStats.matches_played += 1;
    homeStats.wins += homeLetter === "W" ? 1 : 0;
    homeStats.losses += homeLetter === "L" ? 1 : 0;
    homeStats.draws += homeLetter === "D" ? 1 : 0;
    homeStats.total_scored += homeScore;
    homeStats.total_conceded += awayScore;
    homeStats.form = this.nextForm(homeStats.form, homeLetter);

    awayStats.elo_rating = newAwayRating;
    awayStats.matches_played += 1;
    awayStats.wins += awayLetter === "W" ? 1 : 0;
    awayStats.losses += awayLetter === "L" ? 1 : 0;
    awayStats.draws += awayLetter === "D" ? 1 : 0;
    awayStats.total_scored += awayScore;
    awayStats.total_conceded += homeScore;
    awayStats.form = this.nextForm(awayStats.form, awayLetter);
  }

  // Reset all state for a new experiment
  reset(): void {
    this.teamStats.clear();
    this.sportStats.clear();
  }
}

// -----------------------------------------------------------------------------
// EXPERIMENT OUTPUT
// -----------------------------------------------------------------------------
interface MatchPrediction {
  matchId: string;
  timestamp: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeElo: number;
  awayElo: number;
  homeWinOdds: number;
  awayWinOdds: number;
  drawOdds: number;
  actualWinner: string;
  homeScore: number;
  awayScore: number;
  matchType: string;
  predictedOutcome: string;
  correct: boolean;
}

interface ExperimentResult {
  params: TunableParams;
  predictions: MatchPrediction[];
  accuracy: number;
  brierScore: number;
  logLoss: number;
}

// -----------------------------------------------------------------------------
// RUN SINGLE EXPERIMENT
// -----------------------------------------------------------------------------
async function runExperiment(
  season: string,
  params: TunableParams,
  matches: any[]
): Promise<ExperimentResult> {
  const simulator = new EloSimulator(params);
  const predictions: MatchPrediction[] = [];

  for (const data of matches) {
    const homeTeam: string = data.home_college;
    const awayTeam: string = data.away_college;
    const winner: string = data.winner;
    const matchType: "Regular" | "Playoff" | "Final" = data.type;
    const ts: admin.firestore.Timestamp = data.timestamp;
    const homeScore: number = data.home_college_score ?? 0;
    const awayScore: number = data.away_college_score ?? 0;
    const matchSport: string = data.sport;
    const matchId: string = data.id;

    // Get current Elo ratings before prediction
    const homeStats = simulator["getTeamStats"](matchSport, homeTeam);
    const awayStats = simulator["getTeamStats"](matchSport, awayTeam);

    // Calculate odds BEFORE updating Elo
    const bettingVolume = {
      team1: data.home_volume ?? 0,
      team2: data.away_volume ?? 0,
      draw: data.draw_volume ?? 0,
    };

    const odds = simulator.calculateOdds(homeTeam, awayTeam, matchSport, bettingVolume);

    // Determine predicted outcome (highest probability, 3 outcomes only)
    const maxOdds = Math.max(odds.team1Win, odds.team2Win, odds.draw);
    let predictedOutcome: string;
    if (maxOdds === odds.team1Win) predictedOutcome = homeTeam;
    else if (maxOdds === odds.team2Win) predictedOutcome = awayTeam;
    else predictedOutcome = "Draw";

    // Check if prediction was correct
    // Forfeits (Default) are unpredictable - mark as incorrect
    const correct = predictedOutcome === winner;

    predictions.push({
      matchId,
      timestamp: ts.toDate().toISOString(),
      sport: matchSport,
      homeTeam,
      awayTeam,
      homeElo: homeStats.elo_rating,
      awayElo: awayStats.elo_rating,
      homeWinOdds: odds.team1Win,
      awayWinOdds: odds.team2Win,
      drawOdds: odds.draw,
      actualWinner: winner,
      homeScore,
      awayScore,
      matchType,
      predictedOutcome,
      correct,
    });

    // Determine forfeiting team
    let forfeitingTeam: string | undefined;
    if (winner === "Default") {
      if (homeScore === 0 && awayScore === 0) {
        forfeitingTeam = undefined;
      } else if (homeScore === 0 || (awayScore > 0 && awayScore > homeScore)) {
        forfeitingTeam = homeTeam;
      } else if (awayScore === 0 || (homeScore > 0 && homeScore > awayScore)) {
        forfeitingTeam = awayTeam;
      }
    }

    // Update simulator state
    simulator.updateAfterMatch(
      homeTeam,
      awayTeam,
      matchSport,
      winner,
      matchType,
      homeScore,
      awayScore,
      forfeitingTeam
    );
  }

  // Calculate metrics
  const correctCount = predictions.filter((p) => p.correct).length;
  const accuracy = predictions.length > 0 ? correctCount / predictions.length : 0;

  // Brier score (lower is better, 3-class)
  let brierSum = 0;
  for (const p of predictions) {
    const actual = [
      p.actualWinner === p.homeTeam ? 1 : 0,
      p.actualWinner === p.awayTeam ? 1 : 0,
      p.actualWinner === "Draw" ? 1 : 0,
    ];
    const predicted = [p.homeWinOdds, p.awayWinOdds, p.drawOdds];
    for (let i = 0; i < 3; i++) {
      brierSum += (predicted[i] - actual[i]) ** 2;
    }
  }
  const brierScore = predictions.length > 0 ? brierSum / predictions.length : 0;

  // Log loss (lower is better, 3-class)
  let logLossSum = 0;
  const eps = 1e-15;
  for (const p of predictions) {
    let probActual: number;
    if (p.actualWinner === p.homeTeam) probActual = p.homeWinOdds;
    else if (p.actualWinner === p.awayTeam) probActual = p.awayWinOdds;
    else if (p.actualWinner === "Draw") probActual = p.drawOdds;
    else probActual = eps; // Forfeits get near-zero prob (unpredictable)

    logLossSum -= Math.log(Math.max(probActual, eps));
  }
  const logLoss = predictions.length > 0 ? logLossSum / predictions.length : 0;

  return { params, predictions, accuracy, brierScore, logLoss };
}

// -----------------------------------------------------------------------------
// GENERATE PARAMETER COMBINATIONS
// -----------------------------------------------------------------------------
function generateParamCombinations(): TunableParams[] {
  const combinations: TunableParams[] = [];

  // v1.1 parameter ranges for grid search
  const initialElo_values = [800, 850, 900, 1000];
  const baseK_Regular_values = [20, 24, 32];
  const eloScalingFactor_values = [250, 275, 350];
  const drawDmax_values = [0.08, 0.12, 0.15];
  const W_forfeit_values = [0.05, 0.10, 0.15];
  const defaultSportModifier_values = [0.8, 0.9, 1.0];

  for (const initialElo of initialElo_values) {
    for (const baseK_Regular of baseK_Regular_values) {
      for (const eloScalingFactor of eloScalingFactor_values) {
        for (const drawDmax of drawDmax_values) {
          for (const W_forfeit of W_forfeit_values) {
            for (const defaultSportModifier of defaultSportModifier_values) {
              combinations.push({
                ...DEFAULT_PARAMS,
                initialElo,
                baseK_Regular,
                baseK_Playoff: baseK_Regular * 1.5,
                baseK_Final: baseK_Regular * 2,
                eloScalingFactor,
                drawDmax,
                W_forfeit,
                defaultSportModifier,
              });
            }
          }
        }
      }
    }
  }

  return combinations;
}

// -----------------------------------------------------------------------------
// EXPORT TO CSV
// -----------------------------------------------------------------------------
function predictionsToCSV(predictions: MatchPrediction[], params: TunableParams): string {
  const header = [
    "matchId",
    "timestamp",
    "sport",
    "homeTeam",
    "awayTeam",
    "homeElo",
    "awayElo",
    "homeWinOdds",
    "awayWinOdds",
    "drawOdds",
    "actualWinner",
    "homeScore",
    "awayScore",
    "matchType",
    "predictedOutcome",
    "correct",
    "initialElo",
    "baseK_Regular",
    "eloScalingFactor",
    "drawDmax",
    "drawK",
    "W_forfeit",
    "V_threshold",
    "defaultSportModifier",
  ].join(",");

  const rows = predictions.map((p) =>
    [
      p.matchId,
      p.timestamp,
      p.sport,
      p.homeTeam,
      p.awayTeam,
      p.homeElo,
      p.awayElo,
      p.homeWinOdds.toFixed(4),
      p.awayWinOdds.toFixed(4),
      p.drawOdds.toFixed(4),
      p.actualWinner,
      p.homeScore,
      p.awayScore,
      p.matchType,
      p.predictedOutcome,
      p.correct ? 1 : 0,
      params.initialElo,
      params.baseK_Regular,
      params.eloScalingFactor,
      params.drawDmax,
      params.drawK,
      params.W_forfeit,
      params.V_threshold,
      params.defaultSportModifier,
    ].join(",")
  );

  return header + "\n" + rows.join("\n");
}

function summaryToCSV(results: ExperimentResult[]): string {
  const header = [
    "experimentId",
    "initialElo",
    "baseK_Regular",
    "baseK_Playoff",
    "baseK_Final",
    "eloScalingFactor",
    "drawDmax",
    "drawK",
    "W_forfeit",
    "V_threshold",
    "defaultSportModifier",
    "matchCount",
    "accuracy",
    "brierScore",
    "logLoss",
  ].join(",");

  const rows = results.map((r, idx) =>
    [
      idx + 1,
      r.params.initialElo,
      r.params.baseK_Regular,
      r.params.baseK_Playoff,
      r.params.baseK_Final,
      r.params.eloScalingFactor,
      r.params.drawDmax,
      r.params.drawK,
      r.params.W_forfeit,
      r.params.V_threshold,
      r.params.defaultSportModifier,
      r.predictions.length,
      r.accuracy.toFixed(4),
      r.brierScore.toFixed(4),
      r.logLoss.toFixed(4),
    ].join(",")
  );

  return header + "\n" + rows.join("\n");
}

// -----------------------------------------------------------------------------
// HTTP CLOUD FUNCTION
// -----------------------------------------------------------------------------
/**
 * Run Elo prediction experiments with different parameter combinations.
 *
 * Request body:
 * - season: string (e.g., "2025-2026") — REQUIRED
 * - sport: string (optional) — filter to specific sport
 * - limit: number (optional) — limit matches processed
 * - params: TunableParams (optional) — run with specific params only
 * - runAll: boolean (optional) — if true, runs all parameter combinations
 *
 * Returns:
 * - For single run: { success, result: { accuracy, brierScore, logLoss }, csv }
 * - For runAll: { success, summary, summaryCSV, bestParams }
 */
export const runEloExperiment = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { season, sport, limit, params, runAll } = req.body ?? {};

    if (!season || typeof season !== "string") {
      res.status(400).json({ error: "Missing required field 'season'" });
      return;
    }

    // Fetch matches from Firestore
    let q = db
      .collection("matches")
      .doc("seasons")
      .collection(season)
      .orderBy("timestamp", "asc");

    if (sport && typeof sport === "string") {
      q = q.where("sport", "==", sport);
    }

    if (limit && typeof limit === "number" && limit > 0) {
      q = q.limit(limit);
    }

    const snap = await q.get();
    if (snap.empty) {
      res.status(200).json({ success: true, processed: 0, message: "No matches found" });
      return;
    }

    // Filter to only scored matches and prepare data
    const matches = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((m: any) => m.winner && m.home_college && m.away_college && m.sport && m.type && m.timestamp);

    console.log(`Found ${matches.length} scored matches to process`);

    if (runAll) {
      // Run all parameter combinations
      const paramCombinations = generateParamCombinations();
      console.log(`Running ${paramCombinations.length} experiments...`);

      const results: ExperimentResult[] = [];
      for (let i = 0; i < paramCombinations.length; i++) {
        const p = paramCombinations[i];
        const result = await runExperiment(season, p, matches);
        results.push(result);

        if ((i + 1) % 10 === 0) {
          console.log(`Completed ${i + 1}/${paramCombinations.length} experiments`);
        }
      }

      // Find best parameters
      const bestByAccuracy = results.reduce((best, r) =>
        r.accuracy > best.accuracy ? r : best
      );
      const bestByBrier = results.reduce((best, r) =>
        r.brierScore < best.brierScore ? r : best
      );
      const bestByLogLoss = results.reduce((best, r) =>
        r.logLoss < best.logLoss ? r : best
      );

      const summaryCSV = summaryToCSV(results);

      res.status(200).json({
        success: true,
        totalExperiments: results.length,
        matchesPerExperiment: matches.length,
        bestByAccuracy: {
          accuracy: bestByAccuracy.accuracy,
          params: bestByAccuracy.params,
        },
        bestByBrier: {
          brierScore: bestByBrier.brierScore,
          params: bestByBrier.params,
        },
        bestByLogLoss: {
          logLoss: bestByLogLoss.logLoss,
          params: bestByLogLoss.params,
        },
        summaryCSV,
      });
      return;
    }

    // Single experiment with provided or default params
    const experimentParams = params ? { ...DEFAULT_PARAMS, ...params } : DEFAULT_PARAMS;
    const result = await runExperiment(season, experimentParams, matches);
    const csv = predictionsToCSV(result.predictions, experimentParams);

    res.status(200).json({
      success: true,
      matchCount: result.predictions.length,
      accuracy: result.accuracy,
      brierScore: result.brierScore,
      logLoss: result.logLoss,
      params: experimentParams,
      csv,
    });
    return;
  } catch (err: any) {
    console.error("runEloExperiment error", err);
    res.status(500).json({ success: false, error: String(err?.message ?? err) });
    return;
  }
});

// -----------------------------------------------------------------------------
// STANDALONE SCRIPT VERSION (for running locally)
// -----------------------------------------------------------------------------
export async function runLocalExperiment(
  season: string,
  outputDir: string,
  options?: {
    sport?: string;
    limit?: number;
    paramCombinations?: TunableParams[];
  }
): Promise<void> {
  console.log(`Starting local experiment for season ${season}`);

  // Fetch matches
  let q = db
    .collection("matches")
    .doc("seasons")
    .collection(season)
    .orderBy("timestamp", "asc");

  if (options?.sport) {
    q = q.where("sport", "==", options.sport);
  }

  if (options?.limit) {
    q = q.limit(options.limit);
  }

  const snap = await q.get();
  const matches = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((m: any) => m.winner && m.home_college && m.away_college && m.sport && m.type && m.timestamp);

  console.log(`Found ${matches.length} scored matches`);

  const paramCombinations = options?.paramCombinations ?? generateParamCombinations();
  console.log(`Running ${paramCombinations.length} experiments...`);

  const results: ExperimentResult[] = [];

  for (let i = 0; i < paramCombinations.length; i++) {
    const p = paramCombinations[i];
    const result = await runExperiment(season, p, matches);
    results.push(result);

    // Save individual experiment CSV
    const csv = predictionsToCSV(result.predictions, p);
    const filename = `experiment_${i + 1}_k${p.baseK_Regular}_sf${p.eloScalingFactor}_dm${p.drawDmax}.csv`;
    fs.writeFileSync(path.join(outputDir, filename), csv);

    console.log(
      `Experiment ${i + 1}/${paramCombinations.length}: accuracy=${result.accuracy.toFixed(4)}, brier=${result.brierScore.toFixed(4)}, logLoss=${result.logLoss.toFixed(4)}`
    );
  }

  // Save summary
  const summaryCSV = summaryToCSV(results);
  fs.writeFileSync(path.join(outputDir, "experiment_summary.csv"), summaryCSV);

  // Find and log best parameters
  const bestByAccuracy = results.reduce((best, r) => (r.accuracy > best.accuracy ? r : best));
  const bestByBrier = results.reduce((best, r) => (r.brierScore < best.brierScore ? r : best));

  console.log("\n=== BEST RESULTS ===");
  console.log(`Best Accuracy: ${bestByAccuracy.accuracy.toFixed(4)}`);
  console.log("  Params:", JSON.stringify(bestByAccuracy.params, null, 2));
  console.log(`Best Brier Score: ${bestByBrier.brierScore.toFixed(4)}`);
  console.log("  Params:", JSON.stringify(bestByBrier.params, null, 2));
}
