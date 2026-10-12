#!/usr/bin/env npx ts-node
/**
 * Standalone script to run Elo experiments locally.
 * 
 * Usage:
 *   npx ts-node scripts/runExperiment.ts --season 2025-2026
 *   npx ts-node scripts/runExperiment.ts --season 2025-2026 --sport Basketball --limit 100
 *   npx ts-node scripts/runExperiment.ts --season 2025-2026 --runAll
 *   npx ts-node scripts/runExperiment.ts --season 2025-2026 --data-file ./data/matches.json
 *
 * Loads matches from ./data/matches.json by default.
 * Use exportMatches.ts to generate the data file from Firestore.
 */

import * as fs from "fs";
import * as path from "path";

// Re-implement core types and logic here to avoid module loading issues
// This is a self-contained version of the experiment runner

// -----------------------------------------------------------------------------
// TUNABLE PARAMETERS (v1.1)
// -----------------------------------------------------------------------------
interface TunableParams {
  initialElo: number;
  baseK_Regular: number;
  baseK_Playoff: number;
  baseK_Final: number;
  eloScalingFactor: number; // Standard 400 for Elo
  sportModifiers: Record<string, number>;
  defaultSportModifier: number;
  // Draw probability curve parameters
  C_draw: number; // Maximum draw probability when teams are equal (e.g., 0.30)
  S_draw: number; // Draw decay scale - how fast draw prob drops with Elo difference
  // Forfeit tipping factor
  W_forfeit: number; // Weight of forfeit rate difference in odds calculation
  // Market sentiment parameters
  V_threshold: number; // Betting volume threshold for full market influence
  laplaceSmoothingThreshold: number; // Minimum matches before using raw forfeit rates
}

const DEFAULT_PARAMS: TunableParams = {
  // OPTIMIZED PARAMETERS from 525,000 experiment grid search (Feb 2026)
  // Best overall accuracy: 67.96% (297/437 matches)
  // Performance: Home 78.9%, Away 59.7%, Draw 0% (trade-off for higher accuracy)
  initialElo: 850,
  baseK_Regular: 24,
  baseK_Playoff: 36,
  baseK_Final: 48,
  eloScalingFactor: 275,
  sportModifiers: {},
  defaultSportModifier: 0.9,
  C_draw: 0.12,       // Lower draw probability optimizes for win/loss prediction
  S_draw: 0.0008,     // Fast decay - draws unlikely unless very close
  W_forfeit: 0.10,    // Moderate forfeit signal
  V_threshold: 100,   // Balanced market influence
  laplaceSmoothingThreshold: 5,
};

// -----------------------------------------------------------------------------
// HISTORICAL SEASON DATA
// -----------------------------------------------------------------------------
interface HistoricalSportStats {
  avgScoreDifference: number;
  forfeitRate: number;
  totalMatches: number;
}

function loadHistoricalStats(filePath: string): Map<string, HistoricalSportStats> {
  const stats = new Map<string, HistoricalSportStats>();
  
  if (!fs.existsSync(filePath)) {
    console.warn(`Historical stats file not found: ${filePath}. Using defaults.`);
    return stats;
  }
  
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 9) continue;
    
    const sport = parts[0];
    const totalMatches = parseInt(parts[1], 10);
    const scoredMatches = parseInt(parts[2], 10);
    const forfeits = parseInt(parts[4], 10);
    const avgScoreDifference = parseFloat(parts[8]);
    
    stats.set(sport, {
      avgScoreDifference,
      forfeitRate: scoredMatches > 0 ? forfeits / scoredMatches : 0,
      totalMatches,
    });
  }
  
  return stats;
}

// -----------------------------------------------------------------------------
// IN-MEMORY STATE (v1.1)
// -----------------------------------------------------------------------------
interface TeamStats {
  elo_rating: number;
  matches_total: number; // Includes forfeits
  matches_played: number; // Excludes forfeits (played matches only)
  wins_regular: number;
  wins_forfeit: number; // Wins via opponent forfeit
  losses_regular: number;
  losses_forfeit: number; // Losses via own forfeit
  draws: number;
  forfeits_initiated: number; // Times this team forfeited
  points_scored: number; // From played matches only
  points_conceded: number; // From played matches only
  form: string[]; // Last 5: "W", "L", "D", "WF" (win forfeit), "LF" (loss forfeit)
}

interface SportStats {
  matches_total: number;
  matches_played: number;
  draws: number;
  forfeits: number; // Single forfeits (not double)
  double_forfeits: number;
  total_points: number;
  total_score_diff: number;
}

type ResultLetter = "W" | "L" | "D" | "WF" | "LF";

// -----------------------------------------------------------------------------
// ELO SIMULATOR
// -----------------------------------------------------------------------------
class EloSimulator {
  private params: TunableParams;
  private teamStats: Map<string, Map<string, TeamStats>> = new Map();
  private sportStats: Map<string, SportStats> = new Map();
  private historicalStats: Map<string, HistoricalSportStats>;

  constructor(params: TunableParams, historicalStats: Map<string, HistoricalSportStats>) {
    this.params = params;
    this.historicalStats = historicalStats;
  }

  private getDefaultTeamStats(): TeamStats {
    return {
      elo_rating: this.params.initialElo,
      matches_total: 0,
      matches_played: 0,
      wins_regular: 0,
      wins_forfeit: 0,
      losses_regular: 0,
      losses_forfeit: 0,
      draws: 0,
      forfeits_initiated: 0,
      points_scored: 0,
      points_conceded: 0,
      form: [],
    };
  }

  private getDefaultSportStats(): SportStats {
    return {
      matches_total: 0,
      matches_played: 0,
      draws: 0,
      forfeits: 0,
      double_forfeits: 0,
      total_points: 0,
      total_score_diff: 0,
    };
  }

  getTeamStats(sport: string, college: string): TeamStats {
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

  /**
   * v1.1 Draw Probability Function
   * P_draw = C_draw * exp(-S_draw * |R_H - R_A|)
   * Peaks at C_draw when ratings are equal, decays exponentially with difference
   */
  private calculateDrawProbability(homeRating: number, awayRating: number): number {
    const { C_draw, S_draw } = this.params;
    const ratingDiff = Math.abs(homeRating - awayRating);
    return C_draw * Math.exp(-S_draw * ratingDiff);
  }

  /**
   * v1.1 Elo Win/Loss Probabilities
   * Uses standard logistic curve, splits remaining probability after draw
   */
  getEloWinProbabilities(
    homeTeam: string,
    awayTeam: string,
    sport: string
  ): { PHome: number; PDraw: number; PAway: number } {
    const homeStats = this.getTeamStats(sport, homeTeam);
    const awayStats = this.getTeamStats(sport, awayTeam);
    const homeRating = homeStats.elo_rating;
    const awayRating = awayStats.elo_rating;

    const { eloScalingFactor } = this.params;

    // Standard logistic Elo expectation
    const E_H = 1 / (1 + 10 ** ((awayRating - homeRating) / eloScalingFactor));

    // Draw probability using exponential decay
    const PDraw = this.calculateDrawProbability(homeRating, awayRating);

    // Split remaining probability between home and away
    const PHome = (1 - PDraw) * E_H;
    const PAway = (1 - PDraw) * (1 - E_H);

    return { PHome, PDraw, PAway };
  }

  /**
   * v1.1 Forfeit Tipping Factor
   * Calculates Delta_F = Rate_F(Away) - Rate_F(Home)
   * where Rate_F(T) = forfeits_initiated_T / matches_total_T
   * Uses Laplace smoothing for teams with < threshold matches
   */
  private getForfeitTippingFactor(homeTeam: string, awayTeam: string, sport: string): number {
    const homeStats = this.getTeamStats(sport, homeTeam);
    const awayStats = this.getTeamStats(sport, awayTeam);
    const { laplaceSmoothingThreshold } = this.params;

    // Calculate forfeit rate with Laplace smoothing for small sample sizes
    const getForfeitRate = (stats: TeamStats): number => {
      if (stats.matches_total < laplaceSmoothingThreshold) {
        // Laplace smoothing: (successes + 1) / (trials + 2)
        return (stats.forfeits_initiated + 1) / (stats.matches_total + 2);
      }
      return stats.matches_total > 0 ? stats.forfeits_initiated / stats.matches_total : 0;
    };

    const homeRate = getForfeitRate(homeStats);
    const awayRate = getForfeitRate(awayStats);

    // Delta_F = Rate_F(Away) - Rate_F(Home)
    // Positive means away forfeits more, tips odds towards home
    return awayRate - homeRate;
  }

  /**
   * v1.1 Odds Calculation Engine
   * Combines Elo probabilities with forfeit tipping and market sentiment
   * Uses phased weighting to avoid circular dependency
   * Note: No forfeit outcome class - forfeits are settled as Home/Away wins
   */
  calculateOdds(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    bettingVolume: { team1?: number; team2?: number; draw?: number }
  ): { team1Win: number; team2Win: number; draw: number } {
    // Step 1: Get base Elo probabilities
    let { PHome: eloHome, PDraw: eloDraw, PAway: eloAway } =
      this.getEloWinProbabilities(homeTeam, awayTeam, sport);

    // Step 2: Apply forfeit tipping factor
    const deltaF = this.getForfeitTippingFactor(homeTeam, awayTeam, sport);
    const { W_forfeit } = this.params;

    // P_model(H) = P_elo(H) + W_forfeit * Delta_F
    // P_model(A) = P_elo(A) - W_forfeit * Delta_F
    // P_model(D) = P_elo(D)
    let modelHome = eloHome + W_forfeit * deltaF;
    let modelAway = eloAway - W_forfeit * deltaF;
    let modelDraw = eloDraw;

    // Ensure no negative probabilities and normalize
    modelHome = Math.max(0, modelHome);
    modelAway = Math.max(0, modelAway);
    modelDraw = Math.max(0, modelDraw);
    
    const modelSum = modelHome + modelAway + modelDraw;
    if (modelSum > 0) {
      modelHome /= modelSum;
      modelAway /= modelSum;
      modelDraw /= modelSum;
    }

    // Step 3: Calculate market sentiment from betting volume
    // Note: No forfeit betting in v1.1 - forfeits are settled as Home/Away wins
    const v1 = bettingVolume.team1 ?? 0;
    const v2 = bettingVolume.team2 ?? 0;
    const vD = bettingVolume.draw ?? 0;
    const totalBettingVolume = v1 + v2 + vD;

    let marketHome = 1/3;
    let marketAway = 1/3;
    let marketDraw = 1/3;

    if (totalBettingVolume > 0) {
      const sum = v1 + v2 + vD;
      marketHome = v1 / sum;
      marketAway = v2 / sum;
      marketDraw = vD / sum;

      // Apply softmax normalization to market probabilities
      const e1 = Math.exp(marketHome);
      const e2 = Math.exp(marketAway);
      const eD = Math.exp(marketDraw);
      const eSum = e1 + e2 + eD;
      
      marketHome = e1 / eSum;
      marketAway = e2 / eSum;
      marketDraw = eD / eSum;
    }

    // Step 4: Apply phased weighting
    const { V_threshold } = this.params;
    const W_vol = Math.min(1.0, totalBettingVolume / V_threshold);

    // P_final = (1 - W_vol) * P_model + W_vol * P_market
    const team1Win = (1 - W_vol) * modelHome + W_vol * marketHome;
    const team2Win = (1 - W_vol) * modelAway + W_vol * marketAway;
    const draw = (1 - W_vol) * modelDraw + W_vol * marketDraw;

    // Final normalization
    const total = team1Win + team2Win + draw;
    if (total <= 0) {
      return { team1Win: 0.45, team2Win: 0.45, draw: 0.10 };
    }

    return {
      team1Win: team1Win / total,
      team2Win: team2Win / total,
      draw: draw / total,
    };
  }

  /**
   * v1.1 Elo Rating Calculation
   * Standard Elo update based on match outcome (wins, losses, draws)
   * Note: Forfeits do NOT update Elo ratings
   */
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

    // Actual match outcome
    let homeActual: number;
    if (winner === "Draw") {
      homeActual = 0.5;
    } else if (winner === homeTeam) {
      homeActual = 1;
    } else {
      homeActual = 0;
    }
    const awayActual = 1 - homeActual;

    // Expected outcome based on current ratings
    const homeExpected = 1 / (1 + 10 ** ((awayRating - homeRating) / eloScalingFactor));
    const awayExpected = 1 - homeExpected;

    return {
      newHomeRating: Math.round(homeRating + K * (homeActual - homeExpected)),
      newAwayRating: Math.round(awayRating + K * (awayActual - awayExpected)),
    };
  }

  /**
   * v1.1 Match Settlement Logic
   * Handles three cases:
   * 1. Double Forfeit: Both teams forfeit - match voided, no changes
   * 2. Single Forfeit: One team forfeits - winner gets wins_forfeit, loser gets losses_forfeit, NO Elo change
   * 3. Regular Match: Both teams play - Elo updates, regular wins/losses tracked
   */
  updateAfterMatch(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    winner: string,
    matchType: "Regular" | "Playoff" | "Final",
    homeScore: number,
    awayScore: number,
    isDoubleForfeit: boolean,
    isForfeit: boolean,
    forfeitingTeam?: string
  ): void {
    const homeStats = this.getTeamStats(sport, homeTeam);
    const awayStats = this.getTeamStats(sport, awayTeam);
    const sportData = this.getSportStats(sport);

    // Case 1: Double Forfeit - void match, no changes to any stats
    if (isDoubleForfeit) {
      sportData.double_forfeits += 1;
      // Do NOT increment matches_total, matches_played, or any team stats
      // Do NOT change Elo ratings
      return;
    }

    // Increment total matches for both cases below
    sportData.matches_total += 1;

    // Case 2: Single Forfeit - settled as win, no Elo change
    if (isForfeit && forfeitingTeam) {
      sportData.forfeits += 1;

      // Determine winner and loser
      const isHomeForfeit = forfeitingTeam === homeTeam;
      const isAwayForfeit = forfeitingTeam === awayTeam;

      // Update home team stats
      homeStats.matches_total += 1;
      if (isHomeForfeit) {
        homeStats.losses_forfeit += 1;
        homeStats.forfeits_initiated += 1;
        homeStats.form = this.nextForm(homeStats.form, "LF");
      } else if (isAwayForfeit) {
        homeStats.wins_forfeit += 1;
        homeStats.form = this.nextForm(homeStats.form, "WF");
      }

      // Update away team stats
      awayStats.matches_total += 1;
      if (isAwayForfeit) {
        awayStats.losses_forfeit += 1;
        awayStats.forfeits_initiated += 1;
        awayStats.form = this.nextForm(awayStats.form, "LF");
      } else if (isHomeForfeit) {
        awayStats.wins_forfeit += 1;
        awayStats.form = this.nextForm(awayStats.form, "WF");
      }

      // Forfeit scores are NOT added to points_scored/conceded
      // Elo ratings do NOT change
      return;
    }

    // Case 3: Regular Match - both teams played
    sportData.matches_played += 1;
    sportData.draws += winner === "Draw" ? 1 : 0;
    sportData.total_points += homeScore + awayScore;
    sportData.total_score_diff += Math.abs(homeScore - awayScore);

    // Update Elo ratings
    const { newHomeRating, newAwayRating } = this.calculateNewRatings(
      homeStats.elo_rating,
      awayStats.elo_rating,
      winner,
      homeTeam,
      awayTeam,
      matchType,
      sport
    );

    // Determine result letters
    const homeLetter: ResultLetter =
      winner === "Draw" ? "D" : winner === homeTeam ? "W" : "L";
    const awayLetter: ResultLetter =
      winner === "Draw" ? "D" : winner === awayTeam ? "W" : "L";

    // Update home team stats
    homeStats.elo_rating = newHomeRating;
    homeStats.matches_total += 1;
    homeStats.matches_played += 1;
    homeStats.wins_regular += homeLetter === "W" ? 1 : 0;
    homeStats.losses_regular += homeLetter === "L" ? 1 : 0;
    homeStats.draws += homeLetter === "D" ? 1 : 0;
    homeStats.points_scored += homeScore;
    homeStats.points_conceded += awayScore;
    homeStats.form = this.nextForm(homeStats.form, homeLetter);

    // Update away team stats
    awayStats.elo_rating = newAwayRating;
    awayStats.matches_total += 1;
    awayStats.matches_played += 1;
    awayStats.wins_regular += awayLetter === "W" ? 1 : 0;
    awayStats.losses_regular += awayLetter === "L" ? 1 : 0;
    awayStats.draws += awayLetter === "D" ? 1 : 0;
    awayStats.points_scored += awayScore;
    awayStats.points_conceded += homeScore;
    awayStats.form = this.nextForm(awayStats.form, awayLetter);
  }
}

// -----------------------------------------------------------------------------
// EXPERIMENT TYPES (v1.1)
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
  actualWinner: string; // homeTeam, awayTeam, "Draw", or "VOID" for double forfeit
  homeScore: number;
  awayScore: number;
  matchType: string;
  predictedOutcome: string;
  correct: boolean;
  isDoubleForfeit: boolean;
  isForfeit: boolean; // Single forfeit
}

interface OutcomeStats {
  total: number;
  correct: number;
  accuracy: number;
}

interface ConfusionMatrix {
  homeWin: { homeWin: number; awayWin: number; draw: number };
  awayWin: { homeWin: number; awayWin: number; draw: number };
  draw: { homeWin: number; awayWin: number; draw: number };
}

interface ClassMetrics {
  precision: number;  // Of predictions made, how many were correct?
  recall: number;     // Of actual instances, how many were predicted?
  f1Score: number;    // Harmonic mean of precision and recall
  support: number;    // Number of actual instances
}

interface DerivedMetrics {
  homeWin: ClassMetrics;
  awayWin: ClassMetrics;
  draw: ClassMetrics;
  macroAvgF1: number;     // Average F1 across all classes (treats all equally)
  weightedAvgF1: number;  // Weighted by support (more realistic)
}

interface ExperimentResult {
  params: TunableParams;
  predictions: MatchPrediction[];
  accuracy: number;
  brierScore: number;
  logLoss: number;
  // Per-outcome breakdown
  homeWinStats: OutcomeStats;
  awayWinStats: OutcomeStats;
  drawStats: OutcomeStats;
  voidedMatches: number; // Double forfeits
  singleForfeits: number; // Single forfeits (counted as wins)
  // Accuracy excluding draws
  regularMatchAccuracy: number;
  // Confusion matrix
  confusionMatrix: ConfusionMatrix;
  // Derived metrics
  derivedMetrics: DerivedMetrics;
}

// -----------------------------------------------------------------------------
// ERROR ANALYSIS TYPES
// -----------------------------------------------------------------------------
interface SportAccuracy {
  sport: string;
  total: number;
  correct: number;
  accuracy: number;
  avgEloDiff: number;
  homeWinRate: number;
  drawRate: number;
  forfeitRate: number;
}

interface EloBracketAccuracy {
  bracket: string;
  minDiff: number;
  maxDiff: number;
  total: number;
  correct: number;
  accuracy: number;
  avgConfidence: number; // How confident were predictions (max prob)
}

interface ConfidenceAccuracy {
  bracket: string;
  minConf: number;
  maxConf: number;
  total: number;
  correct: number;
  accuracy: number;
}

interface TimeProgressionAccuracy {
  period: string;
  matchRange: string;
  total: number;
  correct: number;
  accuracy: number;
  avgEloDiff: number;
}

// -----------------------------------------------------------------------------
// RUN EXPERIMENT (v1.1)
// -----------------------------------------------------------------------------
function runExperiment(
  params: TunableParams,
  matches: any[],
  historicalStats: Map<string, HistoricalSportStats>
): ExperimentResult {
  const simulator = new EloSimulator(params, historicalStats);
  const predictions: MatchPrediction[] = [];
  let voidedMatchCount = 0;
  let singleForfeitCount = 0;

  for (const data of matches) {
    const homeTeam: string = data.home_college;
    const awayTeam: string = data.away_college;
    const matchType: "Regular" | "Playoff" | "Final" = data.type;
    
    // Handle both Firestore Timestamp and ISO string formats
    const timestampValue = data.timestamp;
    const timestampISO = typeof timestampValue === 'string' 
      ? timestampValue 
      : timestampValue?.toDate?.()?.toISOString() ?? new Date().toISOString();
    
    const homeScore: number = data.home_college_score ?? 0;
    const awayScore: number = data.away_college_score ?? 0;
    const matchSport: string = data.sport;
    const matchId: string = data.id;
    
    // Determine forfeit status
    const isForfeit: boolean = data.forfeit === true;
    let isDoubleForfeit = false;
    let forfeitingTeam: string | undefined;
    let actualWinner: string;

    // v1.1 Forfeit Detection Logic
    if (isForfeit) {
      // Check if double forfeit (both scores 0, or explicitly marked)
      if (homeScore === 0 && awayScore === 0 && !data.winner) {
        isDoubleForfeit = true;
        actualWinner = "VOID";
        voidedMatchCount++;
      } else {
        // Single forfeit - determine forfeiting team
        singleForfeitCount++;
        
        // Use declared winner if available
        if (data.winner) {
          actualWinner = data.winner;
          forfeitingTeam = data.winner === homeTeam ? awayTeam : homeTeam;
        } else {
          // Infer from scores
          if (homeScore === 0 && awayScore > 0) {
            forfeitingTeam = homeTeam;
            actualWinner = awayTeam;
          } else if (awayScore === 0 && homeScore > 0) {
            forfeitingTeam = awayTeam;
            actualWinner = homeTeam;
          } else {
            // Unclear - use higher score
            forfeitingTeam = homeScore > awayScore ? awayTeam : homeTeam;
            actualWinner = homeScore > awayScore ? homeTeam : awayTeam;
          }
        }
      }
    } else {
      // Regular match (played)
      actualWinner = data.winner ?? "Draw";
    }

    // Skip double forfeits from predictions (they're voided)
    if (isDoubleForfeit) {
      // Update simulator state (which does nothing for double forfeits)
      simulator.updateAfterMatch(
        homeTeam,
        awayTeam,
        matchSport,
        actualWinner,
        matchType,
        homeScore,
        awayScore,
        true, // isDoubleForfeit
        false, // isForfeit
        undefined
      );
      continue;
    }

    // Get current Elo ratings before update
    const homeStats = simulator.getTeamStats(matchSport, homeTeam);
    const awayStats = simulator.getTeamStats(matchSport, awayTeam);

    const bettingVolume = {
      team1: data.home_volume ?? 0,
      team2: data.away_volume ?? 0,
      draw: data.draw_volume ?? 0,
    };

    const odds = simulator.calculateOdds(homeTeam, awayTeam, matchSport, bettingVolume);

    // Predict outcome based on highest odds (no separate forfeit class in v1.1)
    const maxOdds = Math.max(odds.team1Win, odds.team2Win, odds.draw);
    let predictedOutcome: string;
    if (maxOdds === odds.team1Win) predictedOutcome = homeTeam;
    else if (maxOdds === odds.team2Win) predictedOutcome = awayTeam;
    else predictedOutcome = "Draw";

    const correct = predictedOutcome === actualWinner;

    predictions.push({
      matchId,
      timestamp: timestampISO,
      sport: matchSport,
      homeTeam,
      awayTeam,
      homeElo: homeStats.elo_rating,
      awayElo: awayStats.elo_rating,
      homeWinOdds: odds.team1Win,
      awayWinOdds: odds.team2Win,
      drawOdds: odds.draw,
      actualWinner,
      homeScore,
      awayScore,
      matchType,
      predictedOutcome,
      correct,
      isDoubleForfeit: false, // Already filtered out
      isForfeit: isForfeit && !isDoubleForfeit,
    });

    // Update simulator state
    simulator.updateAfterMatch(
      homeTeam,
      awayTeam,
      matchSport,
      actualWinner,
      matchType,
      homeScore,
      awayScore,
      false, // isDoubleForfeit (already handled above)
      isForfeit,
      forfeitingTeam
    );
  }

  const correctCount = predictions.filter((p) => p.correct).length;
  const accuracy = predictions.length > 0 ? correctCount / predictions.length : 0;

  // Per-outcome statistics (v1.1: forfeits counted as wins)
  const homeWins = predictions.filter((p) => p.actualWinner === p.homeTeam);
  const awayWins = predictions.filter((p) => p.actualWinner === p.awayTeam);
  const draws = predictions.filter((p) => p.actualWinner === "Draw");

  const homeWinStats: OutcomeStats = {
    total: homeWins.length,
    correct: homeWins.filter((p) => p.correct).length,
    accuracy: homeWins.length > 0 ? homeWins.filter((p) => p.correct).length / homeWins.length : 0,
  };

  const awayWinStats: OutcomeStats = {
    total: awayWins.length,
    correct: awayWins.filter((p) => p.correct).length,
    accuracy: awayWins.length > 0 ? awayWins.filter((p) => p.correct).length / awayWins.length : 0,
  };

  const drawStats: OutcomeStats = {
    total: draws.length,
    correct: draws.filter((p) => p.correct).length,
    accuracy: draws.length > 0 ? draws.filter((p) => p.correct).length / draws.length : 0,
  };

  // Accuracy on non-draw matches
  const regularMatches = [...homeWins, ...awayWins];
  const regularCorrect = regularMatches.filter((p) => p.correct).length;
  const regularMatchAccuracy = regularMatches.length > 0 ? regularCorrect / regularMatches.length : 0;

  // Build confusion matrix (v1.1: only 3 classes)
  const confusionMatrix: ConfusionMatrix = {
    homeWin: { homeWin: 0, awayWin: 0, draw: 0 },
    awayWin: { homeWin: 0, awayWin: 0, draw: 0 },
    draw: { homeWin: 0, awayWin: 0, draw: 0 },
  };

  for (const p of predictions) {
    let actualKey: keyof ConfusionMatrix;
    if (p.actualWinner === p.homeTeam) actualKey = "homeWin";
    else if (p.actualWinner === p.awayTeam) actualKey = "awayWin";
    else actualKey = "draw";

    let predictedKey: keyof ConfusionMatrix["homeWin"];
    if (p.predictedOutcome === p.homeTeam) predictedKey = "homeWin";
    else if (p.predictedOutcome === p.awayTeam) predictedKey = "awayWin";
    else predictedKey = "draw";

    confusionMatrix[actualKey][predictedKey]++;
  }

  // Calculate precision, recall, and F1 for each class
  const calculateClassMetrics = (actualClass: keyof ConfusionMatrix): ClassMetrics => {
    const tp = confusionMatrix[actualClass][actualClass];
    
    // Support = total actual instances of this class
    const support = Object.values(confusionMatrix[actualClass]).reduce((sum, val) => sum + val, 0);
    
    // Predicted = total predictions made for this class (column sum)
    let predicted = 0;
    for (const key in confusionMatrix) {
      predicted += confusionMatrix[key as keyof ConfusionMatrix][actualClass];
    }
    
    const precision = predicted > 0 ? tp / predicted : 0;
    const recall = support > 0 ? tp / support : 0;
    const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    
    return { precision, recall, f1Score, support };
  };

  const derivedMetrics: DerivedMetrics = {
    homeWin: calculateClassMetrics("homeWin"),
    awayWin: calculateClassMetrics("awayWin"),
    draw: calculateClassMetrics("draw"),
    macroAvgF1: 0,
    weightedAvgF1: 0,
  };

  // Calculate macro and weighted average F1
  const f1Scores = [derivedMetrics.homeWin.f1Score, derivedMetrics.awayWin.f1Score, 
                    derivedMetrics.draw.f1Score];
  derivedMetrics.macroAvgF1 = f1Scores.reduce((sum, f1) => sum + f1, 0) / 3;

  const totalSupport = derivedMetrics.homeWin.support + derivedMetrics.awayWin.support + 
                       derivedMetrics.draw.support;
  derivedMetrics.weightedAvgF1 = totalSupport > 0
    ? (derivedMetrics.homeWin.f1Score * derivedMetrics.homeWin.support +
       derivedMetrics.awayWin.f1Score * derivedMetrics.awayWin.support +
       derivedMetrics.draw.f1Score * derivedMetrics.draw.support) / totalSupport
    : 0;

  // Brier Score and Log Loss (v1.1: 3 classes only)
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

  let logLossSum = 0;
  const eps = 1e-15;
  for (const p of predictions) {
    let probActual: number;
    if (p.actualWinner === p.homeTeam) probActual = p.homeWinOdds;
    else if (p.actualWinner === p.awayTeam) probActual = p.awayWinOdds;
    else probActual = p.drawOdds;

    logLossSum -= Math.log(Math.max(probActual, eps));
  }
  const logLoss = predictions.length > 0 ? logLossSum / predictions.length : 0;

  return {
    params,
    predictions,
    accuracy,
    brierScore,
    logLoss,
    homeWinStats,
    awayWinStats,
    drawStats,
    voidedMatches: voidedMatchCount,
    singleForfeits: singleForfeitCount,
    regularMatchAccuracy,
    confusionMatrix,
    derivedMetrics,
  };
}

// -----------------------------------------------------------------------------
// PARAM COMBINATIONS (v1.1)
// -----------------------------------------------------------------------------
function generateParamCombinations(): TunableParams[] {
  const combinations: TunableParams[] = [];

  // EXPANDED v1.1 Parameter Grid
  // Focused on the most impactful parameters based on initial grid search results
  // Total: ~50,000 combinations for high-compute environments
  
  const initialElo_vals = [850, 900, 950, 1000]; // 4 values - refined around best (900)
  const baseK_vals = [24, 28, 32, 36, 40]; // 5 values
  const scalingFactor_vals = [275, 300, 325, 350, 400]; // 5 values
  
  // CRITICAL: Draw probability parameters (fixing 0% draw accuracy)
  const C_draw_vals = [0.12, 0.15, 0.18, 0.20, 0.22, 0.25, 0.28, 0.30, 0.35, 0.40]; // 10 values
  const S_draw_vals = [0.0008, 0.001, 0.0012, 0.0015, 0.002, 0.0025, 0.003]; // 7 values
  
  const W_forfeit_vals = [0.05, 0.08, 0.10, 0.12, 0.15]; // 5 values
  const V_threshold_vals = [50, 75, 100, 125, 150]; // 5 values
  const sportMod_vals = [0.9, 1.0, 1.1]; // 3 values

  console.log("\n" + "=".repeat(80));
  console.log("EXPANDED GRID SEARCH CONFIGURATION");
  console.log("=".repeat(80));
  console.log(`  Initial Elo:     ${initialElo_vals.length} values → [${initialElo_vals.join(", ")}]`);
  console.log(`  Base K:          ${baseK_vals.length} values → [${baseK_vals.join(", ")}]`);
  console.log(`  Scaling Factor:  ${scalingFactor_vals.length} values → [${scalingFactor_vals.join(", ")}]`);
  console.log(`  C_draw:          ${C_draw_vals.length} values → [${C_draw_vals.join(", ")}]`);
  console.log(`  S_draw:          ${S_draw_vals.length} values → [${S_draw_vals.join(", ")}]`);
  console.log(`  W_forfeit:       ${W_forfeit_vals.length} values → [${W_forfeit_vals.join(", ")}]`);
  console.log(`  V_threshold:     ${V_threshold_vals.length} values → [${V_threshold_vals.join(", ")}]`);
  console.log(`  Sport Modifier:  ${sportMod_vals.length} values → [${sportMod_vals.join(", ")}]`);
  
  const totalCombinations = initialElo_vals.length * baseK_vals.length * 
    scalingFactor_vals.length * C_draw_vals.length * S_draw_vals.length *
    W_forfeit_vals.length * V_threshold_vals.length * sportMod_vals.length;
  
  console.log("\n" + "-".repeat(80));
  console.log(`Total combinations: ${totalCombinations.toLocaleString()}`);
  console.log(`Estimated runtime:`);
  console.log(`  @ 10 exp/min:  ${(totalCombinations / 10 / 60).toFixed(1)} hours`);
  console.log(`  @ 20 exp/min:  ${(totalCombinations / 20 / 60).toFixed(1)} hours`);
  console.log(`  @ 50 exp/min:  ${(totalCombinations / 50 / 60).toFixed(1)} hours`);
  console.log("=".repeat(80) + "\n");

  let count = 0;
  const startTime = Date.now();

  for (const initialElo of initialElo_vals) {
    for (const baseK_Regular of baseK_vals) {
      for (const eloScalingFactor of scalingFactor_vals) {
        for (const C_draw of C_draw_vals) {
          for (const S_draw of S_draw_vals) {
            for (const W_forfeit of W_forfeit_vals) {
              for (const V_threshold of V_threshold_vals) {
                for (const defaultSportModifier of sportMod_vals) {
                  combinations.push({
                    ...DEFAULT_PARAMS,
                    initialElo,
                    baseK_Regular,
                    baseK_Playoff: baseK_Regular * 1.5,
                    baseK_Final: baseK_Regular * 2,
                    eloScalingFactor,
                    C_draw,
                    S_draw,
                    W_forfeit,
                    V_threshold,
                    defaultSportModifier,
                  });
                  count++;
                  
                  // Progress indicator
                  if (count % 10000 === 0) {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    process.stdout.write(`\rGenerating combinations: ${count.toLocaleString()}/${totalCombinations.toLocaleString()} (${elapsed}s)`);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  console.log(`\rGenerated ${combinations.length.toLocaleString()} parameter combinations.\n`);
  return combinations;
}

// -----------------------------------------------------------------------------
// DISPLAY HELPERS (v1.1)
// -----------------------------------------------------------------------------
function printConfusionMatrix(cm: ConfusionMatrix): void {
  console.log("\n=== CONFUSION MATRIX (v1.1) ===");
  console.log("Rows = Actual, Columns = Predicted\n");
  
  const colWidth = 12;
  const header = "Actual \\ Pred".padEnd(14) + 
    "Home Win".padEnd(colWidth) +
    "Away Win".padEnd(colWidth) +
    "Draw".padEnd(colWidth);
  
  console.log(header);
  console.log("-".repeat(14 + colWidth * 3));
  
  const rows: [string, keyof ConfusionMatrix][] = [
    ["Home Win", "homeWin"],
    ["Away Win", "awayWin"],
    ["Draw", "draw"],
  ];
  
  for (const [label, key] of rows) {
    const row = label.padEnd(14) +
      cm[key].homeWin.toString().padEnd(colWidth) +
      cm[key].awayWin.toString().padEnd(colWidth) +
      cm[key].draw.toString().padEnd(colWidth);
    console.log(row);
  }
  console.log();
}

function printDerivedMetrics(dm: DerivedMetrics): void {
  console.log("=== CLASSIFICATION METRICS (v1.1) ===");
  console.log("Precision = Of predictions made, % correct");
  console.log("Recall = Of actual cases, % found");
  console.log("F1 = Harmonic mean (balance of precision & recall)\n");
  
  const colWidth = 12;
  const header = "Class".padEnd(14) + 
    "Precision".padEnd(colWidth) +
    "Recall".padEnd(colWidth) +
    "F1-Score".padEnd(colWidth) +
    "Support".padEnd(colWidth);
  
  console.log(header);
  console.log("-".repeat(14 + colWidth * 4));
  
  const classes: [string, keyof DerivedMetrics][] = [
    ["Home Win", "homeWin"],
    ["Away Win", "awayWin"],
    ["Draw", "draw"],
  ];
  
  for (const [label, key] of classes) {
    const metrics = dm[key] as ClassMetrics;
    const row = label.padEnd(14) +
      (metrics.precision * 100).toFixed(1).padEnd(colWidth) +
      (metrics.recall * 100).toFixed(1).padEnd(colWidth) +
      (metrics.f1Score * 100).toFixed(1).padEnd(colWidth) +
      metrics.support.toString().padEnd(colWidth);
    console.log(row);
  }
  
  console.log("-".repeat(14 + colWidth * 4));
  console.log(`Macro Avg F1 (unweighted):    ${(dm.macroAvgF1 * 100).toFixed(1)}%`);
  console.log(`Weighted Avg F1 (by support): ${(dm.weightedAvgF1 * 100).toFixed(1)}%`);
  console.log();
}

// -----------------------------------------------------------------------------
// ERROR ANALYSIS FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Analyze accuracy by sport to identify which sports are harder to predict
 */
function analyzeBySport(predictions: MatchPrediction[]): SportAccuracy[] {
  const sportMap = new Map<string, MatchPrediction[]>();
  
  for (const p of predictions) {
    if (!sportMap.has(p.sport)) {
      sportMap.set(p.sport, []);
    }
    sportMap.get(p.sport)!.push(p);
  }
  
  const results: SportAccuracy[] = [];
  
  for (const [sport, matches] of sportMap) {
    const total = matches.length;
    const correct = matches.filter(m => m.correct).length;
    const avgEloDiff = matches.reduce((sum, m) => sum + Math.abs(m.homeElo - m.awayElo), 0) / total;
    const homeWins = matches.filter(m => m.actualWinner === m.homeTeam).length;
    const draws = matches.filter(m => m.actualWinner === "Draw").length;
    const forfeits = matches.filter(m => m.isForfeit).length;
    
    results.push({
      sport,
      total,
      correct,
      accuracy: correct / total,
      avgEloDiff,
      homeWinRate: homeWins / total,
      drawRate: draws / total,
      forfeitRate: forfeits / total,
    });
  }
  
  return results.sort((a, b) => a.accuracy - b.accuracy);
}

/**
 * Analyze accuracy by Elo difference to see if close matches are harder to predict
 */
function analyzeByEloDifference(predictions: MatchPrediction[]): EloBracketAccuracy[] {
  const brackets = [
    { name: "0-50", min: 0, max: 50 },
    { name: "50-100", min: 50, max: 100 },
    { name: "100-200", min: 100, max: 200 },
    { name: "200-400", min: 200, max: 400 },
    { name: "400+", min: 400, max: Infinity },
  ];
  
  const results: EloBracketAccuracy[] = [];
  
  for (const bracket of brackets) {
    const matches = predictions.filter(p => {
      const diff = Math.abs(p.homeElo - p.awayElo);
      return diff >= bracket.min && diff < bracket.max;
    });
    
    if (matches.length === 0) continue;
    
    const total = matches.length;
    const correct = matches.filter(m => m.correct).length;
    const avgConfidence = matches.reduce((sum, m) => {
      return sum + Math.max(m.homeWinOdds, m.awayWinOdds, m.drawOdds);
    }, 0) / total;
    
    results.push({
      bracket: bracket.name,
      minDiff: bracket.min,
      maxDiff: bracket.max,
      total,
      correct,
      accuracy: correct / total,
      avgConfidence,
    });
  }
  
  return results;
}

/**
 * Analyze accuracy by prediction confidence to see calibration
 */
function analyzeByConfidence(predictions: MatchPrediction[]): ConfidenceAccuracy[] {
  const brackets = [
    { name: "33-40%", min: 0.33, max: 0.40 },
    { name: "40-50%", min: 0.40, max: 0.50 },
    { name: "50-60%", min: 0.50, max: 0.60 },
    { name: "60-70%", min: 0.60, max: 0.70 },
    { name: "70-80%", min: 0.70, max: 0.80 },
    { name: "80-90%", min: 0.80, max: 0.90 },
    { name: "90-100%", min: 0.90, max: 1.01 },
  ];
  
  const results: ConfidenceAccuracy[] = [];
  
  for (const bracket of brackets) {
    const matches = predictions.filter(p => {
      const maxProb = Math.max(p.homeWinOdds, p.awayWinOdds, p.drawOdds);
      return maxProb >= bracket.min && maxProb < bracket.max;
    });
    
    if (matches.length === 0) continue;
    
    const total = matches.length;
    const correct = matches.filter(m => m.correct).length;
    
    results.push({
      bracket: bracket.name,
      minConf: bracket.min,
      maxConf: bracket.max,
      total,
      correct,
      accuracy: correct / total,
    });
  }
  
  return results;
}

/**
 * Analyze accuracy over time to see if it improves as Elo stabilizes
 */
function analyzeByTimeProgression(predictions: MatchPrediction[]): TimeProgressionAccuracy[] {
  const sortedPreds = [...predictions].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const chunkSize = Math.ceil(sortedPreds.length / 5);
  const results: TimeProgressionAccuracy[] = [];
  
  for (let i = 0; i < 5; i++) {
    const start = i * chunkSize;
    const end = Math.min((i + 1) * chunkSize, sortedPreds.length);
    const chunk = sortedPreds.slice(start, end);
    
    if (chunk.length === 0) continue;
    
    const total = chunk.length;
    const correct = chunk.filter(m => m.correct).length;
    const avgEloDiff = chunk.reduce((sum, m) => sum + Math.abs(m.homeElo - m.awayElo), 0) / total;
    
    results.push({
      period: `Period ${i + 1}`,
      matchRange: `${start + 1}-${end}`,
      total,
      correct,
      accuracy: correct / total,
      avgEloDiff,
    });
  }
  
  return results;
}

/**
 * Analyze home field advantage impact
 */
function analyzeHomeFieldAdvantage(predictions: MatchPrediction[]): void {
  const total = predictions.length;
  const homeWins = predictions.filter(p => p.actualWinner === p.homeTeam).length;
  const awayWins = predictions.filter(p => p.actualWinner === p.awayTeam).length;
  const draws = predictions.filter(p => p.actualWinner === "Draw").length;
  
  console.log("\n=== HOME FIELD ADVANTAGE ANALYSIS ===");
  console.log(`Home Wins: ${homeWins}/${total} (${(homeWins / total * 100).toFixed(1)}%)`);
  console.log(`Away Wins: ${awayWins}/${total} (${(awayWins / total * 100).toFixed(1)}%)`);
  console.log(`Draws: ${draws}/${total} (${(draws / total * 100).toFixed(1)}%)`);
  
  // Calculate if model is biased towards home or away
  const homePredictions = predictions.filter(p => p.predictedOutcome === p.homeTeam).length;
  const awayPredictions = predictions.filter(p => p.predictedOutcome === p.awayTeam).length;
  const drawPredictions = predictions.filter(p => p.predictedOutcome === "Draw").length;
  
  console.log(`\nModel Predictions:`);  
  console.log(`Home Predicted: ${homePredictions}/${total} (${(homePredictions / total * 100).toFixed(1)}%)`);
  console.log(`Away Predicted: ${awayPredictions}/${total} (${(awayPredictions / total * 100).toFixed(1)}%)`);
  console.log(`Draw Predicted: ${drawPredictions}/${total} (${(drawPredictions / total * 100).toFixed(1)}%)`);
  console.log();
}

/**
 * Print comprehensive error analysis
 */
function printErrorAnalysis(predictions: MatchPrediction[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("ERROR ANALYSIS - DIAGNOSTIC BREAKDOWN");
  console.log("=".repeat(80));
  
  // 1. By Sport
  console.log("\n=== ACCURACY BY SPORT (lowest to highest) ===");
  const bySport = analyzeBySport(predictions);
  console.log("Sport".padEnd(20) + "Matches".padEnd(10) + "Correct".padEnd(10) + "Accuracy".padEnd(12) + 
              "Avg Elo Δ".padEnd(12) + "Home Win%".padEnd(12) + "Draw%".padEnd(10) + "Forfeit%");
  console.log("-".repeat(100));
  for (const s of bySport) {
    console.log(
      s.sport.padEnd(20) +
      s.total.toString().padEnd(10) +
      s.correct.toString().padEnd(10) +
      `${(s.accuracy * 100).toFixed(1)}%`.padEnd(12) +
      s.avgEloDiff.toFixed(0).padEnd(12) +
      `${(s.homeWinRate * 100).toFixed(1)}%`.padEnd(12) +
      `${(s.drawRate * 100).toFixed(1)}%`.padEnd(10) +
      `${(s.forfeitRate * 100).toFixed(1)}%`
    );
  }
  
  // 2. By Elo Difference
  console.log("\n=== ACCURACY BY ELO DIFFERENCE ===");
  const byElo = analyzeByEloDifference(predictions);
  console.log("Elo Diff".padEnd(15) + "Matches".padEnd(10) + "Correct".padEnd(10) + 
              "Accuracy".padEnd(12) + "Avg Confidence");
  console.log("-".repeat(60));
  for (const e of byElo) {
    console.log(
      e.bracket.padEnd(15) +
      e.total.toString().padEnd(10) +
      e.correct.toString().padEnd(10) +
      `${(e.accuracy * 100).toFixed(1)}%`.padEnd(12) +
      `${(e.avgConfidence * 100).toFixed(1)}%`
    );
  }
  
  // 3. By Confidence (Calibration)
  console.log("\n=== CALIBRATION ANALYSIS (Confidence vs Accuracy) ===");
  console.log("If well-calibrated, 70% confidence should be 70% accurate");
  const byConf = analyzeByConfidence(predictions);
  console.log("Confidence".padEnd(15) + "Matches".padEnd(10) + "Correct".padEnd(10) + 
              "Accuracy".padEnd(12) + "Calibration");
  console.log("-".repeat(65));
  for (const c of byConf) {
    const midpoint = (c.minConf + c.maxConf) / 2;
    const calibrationError = Math.abs(c.accuracy - midpoint) * 100;
    const calibration = calibrationError < 5 ? "✓ Good" : 
                       calibrationError < 10 ? "~ OK" : "✗ Poor";
    console.log(
      c.bracket.padEnd(15) +
      c.total.toString().padEnd(10) +
      c.correct.toString().padEnd(10) +
      `${(c.accuracy * 100).toFixed(1)}%`.padEnd(12) +
      calibration
    );
  }
  
  // 4. Time Progression
  console.log("\n=== ACCURACY OVER TIME (Does it improve as season progresses?) ===");
  const byTime = analyzeByTimeProgression(predictions);
  console.log("Period".padEnd(12) + "Matches".padEnd(15) + "Correct".padEnd(10) + 
              "Accuracy".padEnd(12) + "Avg Elo Δ");
  console.log("-".repeat(60));
  for (const t of byTime) {
    console.log(
      t.period.padEnd(12) +
      t.matchRange.padEnd(15) +
      t.correct.toString().padEnd(10) +
      `${(t.accuracy * 100).toFixed(1)}%`.padEnd(12) +
      t.avgEloDiff.toFixed(0)
    );
  }
  
  // 5. Home Field Advantage
  analyzeHomeFieldAdvantage(predictions);
  
  // 6. Key Insights
  console.log("\n=== KEY INSIGHTS ===");
  
  // Find hardest sport
  const hardestSport = bySport[0];
  const easiestSport = bySport[bySport.length - 1];
  console.log(`• Hardest sport to predict: ${hardestSport.sport} (${(hardestSport.accuracy * 100).toFixed(1)}%)`);
  console.log(`• Easiest sport to predict: ${easiestSport.sport} (${(easiestSport.accuracy * 100).toFixed(1)}%)`);
  
  // Check if close matches are harder
  const closeMatches = byElo.find(e => e.bracket === "0-50");
  const blowouts = byElo[byElo.length - 1];
  if (closeMatches && blowouts) {
    console.log(`• Close matches (Elo diff 0-50): ${(closeMatches.accuracy * 100).toFixed(1)}% accuracy`);
    console.log(`• Blowout predictions (Elo diff ${blowouts.bracket}): ${(blowouts.accuracy * 100).toFixed(1)}% accuracy`);
  }
  
  // Check calibration
  const highConfPreds = predictions.filter(p => Math.max(p.homeWinOdds, p.awayWinOdds, p.drawOdds) > 0.7);
  const highConfAcc = highConfPreds.filter(p => p.correct).length / highConfPreds.length;
  console.log(`• High confidence predictions (>70%): ${(highConfAcc * 100).toFixed(1)}% accuracy on ${highConfPreds.length} matches`);
  
  console.log("\n" + "=".repeat(80));
}

// -----------------------------------------------------------------------------
// CSV HELPERS (v1.1)
// -----------------------------------------------------------------------------
function predictionsToCSV(predictions: MatchPrediction[], params: TunableParams): string {
  const header = [
    "matchId", "timestamp", "sport", "homeTeam", "awayTeam", "homeElo", "awayElo",
    "homeWinOdds", "awayWinOdds", "drawOdds", "actualWinner",
    "homeScore", "awayScore", "matchType", "predictedOutcome", "correct",
    "isForfeit", "isDoubleForfeit",
    "initialElo", "baseK_Regular", "eloScalingFactor", "C_draw", "S_draw",
    "W_forfeit", "V_threshold", "defaultSportModifier",
  ].join(",");

  const rows = predictions.map((p) =>
    [
      p.matchId, p.timestamp, p.sport, p.homeTeam, p.awayTeam, p.homeElo, p.awayElo,
      p.homeWinOdds.toFixed(4), p.awayWinOdds.toFixed(4), p.drawOdds.toFixed(4),
      p.actualWinner, p.homeScore, p.awayScore,
      p.matchType, p.predictedOutcome, p.correct ? 1 : 0,
      p.isForfeit ? 1 : 0, p.isDoubleForfeit ? 1 : 0,
      params.initialElo, params.baseK_Regular, params.eloScalingFactor,
      params.C_draw, params.S_draw, params.W_forfeit, params.V_threshold,
      params.defaultSportModifier,
    ].join(",")
  );

  return header + "\n" + rows.join("\n");
}

function summaryToCSV(results: ExperimentResult[]): string {
  const header = [
    "experimentId", "initialElo", "baseK_Regular", "baseK_Playoff", "baseK_Final",
    "eloScalingFactor", "C_draw", "S_draw", "W_forfeit", "V_threshold",
    "defaultSportModifier", "matchCount", "voidedMatches", "singleForfeits",
    "accuracy", "brierScore", "logLoss",
  ].join(",");

  const rows = results.map((r, idx) =>
    [
      idx + 1, r.params.initialElo, r.params.baseK_Regular, r.params.baseK_Playoff,
      r.params.baseK_Final, r.params.eloScalingFactor, r.params.C_draw,
      r.params.S_draw, r.params.W_forfeit, r.params.V_threshold,
      r.params.defaultSportModifier, r.predictions.length, r.voidedMatches,
      r.singleForfeits, r.accuracy.toFixed(4), r.brierScore.toFixed(4),
      r.logLoss.toFixed(4),
    ].join(",")
  );

  return header + "\n" + rows.join("\n");
}

// -----------------------------------------------------------------------------
// DATA LOADING
// -----------------------------------------------------------------------------
interface ExportedData {
  season: string;
  exportedAt: string;
  totalMatches: number;
  sports: {
    [sport: string]: any[];
  };
}

function loadMatchesFromFile(filePath: string, sport?: string): any[] {
  console.log(`Loading matches from ${filePath}...`);
  const content = fs.readFileSync(filePath, "utf-8");
  const data: ExportedData = JSON.parse(content);

  let allMatches: any[] = [];
  if (sport) {
    if (!data.sports[sport]) {
      throw new Error(`Sport "${sport}" not found in data file`);
    }
    allMatches = data.sports[sport];
  } else {
    // Combine all sports
    for (const sportName in data.sports) {
      allMatches = allMatches.concat(data.sports[sportName]);
    }
    // Sort by timestamp
    allMatches.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateA - dateB;
    });
  }

  return allMatches;
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let season = "";
  let sport: string | undefined;
  let limit: number | undefined;
  let runAll = false;
  let outputDir = "./experiment_output";
  let dataFile = "./data/matches.json";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--season" && args[i + 1]) {
      season = args[++i];
    } else if (args[i] === "--sport" && args[i + 1]) {
      sport = args[++i];
    } else if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[++i], 10);
    } else if (args[i] === "--runAll") {
      runAll = true;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputDir = args[++i];
    } else if (args[i] === "--data-file" && args[i + 1]) {
      dataFile = args[++i];
    }
  }

  if (!season) {
    console.error("Usage: npx ts-node scripts/runExperiment.ts --season <season> [--sport <sport>] [--limit <n>] [--runAll] [--output <dir>] [--data-file <path>]");
    console.error("Example: npx ts-node scripts/runExperiment.ts --season 2025-2026 --runAll");
    console.error("         npx ts-node scripts/runExperiment.ts --season 2025-2026 --data-file ./custom/path.json");
    process.exit(1);
  }

  console.log(`Starting experiment for season ${season}`);
  if (sport) console.log(`Filtering to sport: ${sport}`);
  if (limit) console.log(`Limiting to ${limit} matches`);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load historical season statistics
  const historicalStatsFile = "./stats/season_stats_2425.csv";
  const historicalStats = loadHistoricalStats(historicalStatsFile);
  console.log(`Loaded historical stats for ${historicalStats.size} sports`);

  // Load matches from file
  const rawMatches = loadMatchesFromFile(dataFile, sport);

  // Apply limit if specified
  const limitedMatches = limit ? rawMatches.slice(0, limit) : rawMatches;

  // Filter to only scored matches
  const matches = limitedMatches
    .filter((m: any) => (m.winner || m.forfeit === true) && m.home_college && m.away_college && m.sport && m.type && m.timestamp);

  console.log(`Found ${matches.length} scored matches`);

  if (matches.length === 0) {
    console.log("No matches to process. Exiting.");
    process.exit(0);
  }

  if (runAll) {
    const paramCombinations = generateParamCombinations();
    console.log(`Running ${paramCombinations.length} experiments (v1.1)...`);

    // Memory-efficient approach: stream to CSV and only keep top results
    const summaryPath = path.join(outputDir, "experiment_summary.csv");
    const summaryHeader = [
      "experimentId", "initialElo", "baseK_Regular", "baseK_Playoff", "baseK_Final",
      "eloScalingFactor", "C_draw", "S_draw", "W_forfeit", "V_threshold",
      "defaultSportModifier", "matchCount", "voidedMatches", "singleForfeits",
      "accuracy", "regularMatchAccuracy", "brierScore", "logLoss",
      "homeWinTotal", "homeWinCorrect", "homeWinAccuracy",
      "awayWinTotal", "awayWinCorrect", "awayWinAccuracy",
      "drawTotal", "drawCorrect", "drawAccuracy",
    ].join(",");
    fs.writeFileSync(summaryPath, summaryHeader + "\n");

    // Track top 10 results for each metric
    const topByAccuracy: ExperimentResult[] = [];
    const topByBrier: ExperimentResult[] = [];
    const topByLogLoss: ExperimentResult[] = [];
    const TOP_N = 10;

    // Enhanced progress tracking
    const startTime = Date.now();
    let bestSoFar = { accuracy: 0, brier: Infinity, drawAcc: 0 };
    const CHECKPOINT_INTERVAL = 5000; // Save checkpoint every 5000 experiments
    const PROGRESS_INTERVAL = 50; // Update progress every 50 experiments

    for (let i = 0; i < paramCombinations.length; i++) {
      const p = paramCombinations[i];
      const result = runExperiment(p, matches, historicalStats);
      
      // Append to CSV immediately (memory efficient)
      const row = [
        i + 1, result.params.initialElo, result.params.baseK_Regular, result.params.baseK_Playoff,
        result.params.baseK_Final, result.params.eloScalingFactor, result.params.C_draw,
        result.params.S_draw, result.params.W_forfeit, result.params.V_threshold,
        result.params.defaultSportModifier, result.predictions.length, result.voidedMatches,
        result.singleForfeits, result.accuracy.toFixed(4), result.regularMatchAccuracy.toFixed(4),
        result.brierScore.toFixed(4), result.logLoss.toFixed(4),
        result.homeWinStats.total, result.homeWinStats.correct, result.homeWinStats.accuracy.toFixed(4),
        result.awayWinStats.total, result.awayWinStats.correct, result.awayWinStats.accuracy.toFixed(4),
        result.drawStats.total, result.drawStats.correct, result.drawStats.accuracy.toFixed(4),
      ].join(",");
      fs.appendFileSync(summaryPath, row + "\n");

      // Track top results (keep predictions only for top candidates)
      // For accuracy (higher is better)
      if (topByAccuracy.length < TOP_N || result.accuracy > topByAccuracy[topByAccuracy.length - 1].accuracy) {
        topByAccuracy.push(result);
        topByAccuracy.sort((a, b) => b.accuracy - a.accuracy);
        if (topByAccuracy.length > TOP_N) {
          topByAccuracy.pop(); // Remove worst, free memory
        }
      }
      
      // For Brier (lower is better)
      if (topByBrier.length < TOP_N || result.brierScore < topByBrier[topByBrier.length - 1].brierScore) {
        // Only keep predictions for top brier if not already in top accuracy
        const resultForBrier = topByAccuracy.includes(result) ? result : {
          ...result,
          predictions: result.predictions, // Keep for potential saving
        };
        topByBrier.push(resultForBrier);
        topByBrier.sort((a, b) => a.brierScore - b.brierScore);
        if (topByBrier.length > TOP_N) {
          topByBrier.pop();
        }
      }
      
      // For LogLoss (lower is better)  
      if (topByLogLoss.length < TOP_N || result.logLoss < topByLogLoss[topByLogLoss.length - 1].logLoss) {
        const resultForLogLoss = topByAccuracy.includes(result) || topByBrier.includes(result) ? result : {
          ...result,
          predictions: result.predictions,
        };
        topByLogLoss.push(resultForLogLoss);
        topByLogLoss.sort((a, b) => a.logLoss - b.logLoss);
        if (topByLogLoss.length > TOP_N) {
          topByLogLoss.pop();
        }
      }

      // Update best so far tracking
      if (result.accuracy > bestSoFar.accuracy) bestSoFar.accuracy = result.accuracy;
      if (result.brierScore < bestSoFar.brier) bestSoFar.brier = result.brierScore;
      if (result.drawStats.accuracy > bestSoFar.drawAcc) bestSoFar.drawAcc = result.drawStats.accuracy;

      // Enhanced progress reporting
      if ((i + 1) % PROGRESS_INTERVAL === 0 || i === paramCombinations.length - 1) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (i + 1) / elapsed; // experiments per second
        const remaining = paramCombinations.length - (i + 1);
        const etaSeconds = remaining / rate;
        const etaHours = (etaSeconds / 3600).toFixed(1);
        const etaMinutes = (etaSeconds / 60).toFixed(0);
        
        const progress = ((i + 1) / paramCombinations.length * 100).toFixed(1);
        const currentParams = `Elo=${p.initialElo} K=${p.baseK_Regular} C=${p.C_draw} S=${p.S_draw}`;
        
        console.log(
          `[${(i + 1).toLocaleString()}/${paramCombinations.length.toLocaleString()}] ${progress}% | ` +
          `acc=${result.accuracy.toFixed(4)} (best=${bestSoFar.accuracy.toFixed(4)}) | ` +
          `draw=${result.drawStats.accuracy.toFixed(2)} (best=${bestSoFar.drawAcc.toFixed(2)}) | ` +
          `brier=${result.brierScore.toFixed(2)} | ` +
          `${rate.toFixed(1)} exp/s | ` +
          `ETA: ${etaSeconds > 3600 ? etaHours + 'h' : etaMinutes + 'm'}`
        );
      }

      // Save checkpoint periodically
      if ((i + 1) % CHECKPOINT_INTERVAL === 0) {
        const checkpointPath = path.join(outputDir, `checkpoint_${i + 1}.json`);
        fs.writeFileSync(checkpointPath, JSON.stringify({
          completed: i + 1,
          total: paramCombinations.length,
          bestAccuracy: bestSoFar.accuracy,
          bestBrier: bestSoFar.brier,
          bestDrawAccuracy: bestSoFar.drawAcc,
          timestamp: new Date().toISOString()
        }, null, 2));
        console.log(`  ✓ Checkpoint saved (${i + 1}/${paramCombinations.length})`);
      }
    }

    console.log(`\nSaved summary to ${summaryPath}`);

    // Get best results
    const bestByAccuracy = topByAccuracy[0];
    const bestByBrier = topByBrier[0];
    const bestByLogLoss = topByLogLoss[0];

    console.log("\n=== BEST RESULTS (v1.1) ===");
    console.log(`\nBest Accuracy: ${(bestByAccuracy.accuracy * 100).toFixed(2)}%`);
    console.log(`  Regular matches only: ${(bestByAccuracy.regularMatchAccuracy * 100).toFixed(2)}%`);
    console.log(`  Voided matches (double forfeits): ${bestByAccuracy.voidedMatches}`);
    console.log(`  Single forfeits (counted as wins): ${bestByAccuracy.singleForfeits}`);
    console.log(`  initialElo=${bestByAccuracy.params.initialElo}, baseK=${bestByAccuracy.params.baseK_Regular}, scalingFactor=${bestByAccuracy.params.eloScalingFactor}, C_draw=${bestByAccuracy.params.C_draw}, S_draw=${bestByAccuracy.params.S_draw}, W_forfeit=${bestByAccuracy.params.W_forfeit}, V_threshold=${bestByAccuracy.params.V_threshold}, sportMod=${bestByAccuracy.params.defaultSportModifier}`);
    
    console.log(`\nBest Brier Score: ${bestByBrier.brierScore.toFixed(4)}`);
    console.log(`  initialElo=${bestByBrier.params.initialElo}, baseK=${bestByBrier.params.baseK_Regular}, scalingFactor=${bestByBrier.params.eloScalingFactor}, C_draw=${bestByBrier.params.C_draw}, S_draw=${bestByBrier.params.S_draw}, W_forfeit=${bestByBrier.params.W_forfeit}, V_threshold=${bestByBrier.params.V_threshold}, sportMod=${bestByBrier.params.defaultSportModifier}`);
    
    console.log(`\nBest Log Loss: ${bestByLogLoss.logLoss.toFixed(4)}`);
    console.log(`  initialElo=${bestByLogLoss.params.initialElo}, baseK=${bestByLogLoss.params.baseK_Regular}, scalingFactor=${bestByLogLoss.params.eloScalingFactor}, C_draw=${bestByLogLoss.params.C_draw}, S_draw=${bestByLogLoss.params.S_draw}, W_forfeit=${bestByLogLoss.params.W_forfeit}, V_threshold=${bestByLogLoss.params.V_threshold}, sportMod=${bestByLogLoss.params.defaultSportModifier}`);

    // Per-outcome breakdown for best accuracy params
    console.log("\n=== OUTCOME BREAKDOWN (Best Accuracy Params) ===");
    console.log(`Total Predictions: ${bestByAccuracy.predictions.length}`);
    console.log(`Home Wins:  ${bestByAccuracy.homeWinStats.correct}/${bestByAccuracy.homeWinStats.total} correct (${(bestByAccuracy.homeWinStats.accuracy * 100).toFixed(2)}%)`);
    console.log(`Away Wins:  ${bestByAccuracy.awayWinStats.correct}/${bestByAccuracy.awayWinStats.total} correct (${(bestByAccuracy.awayWinStats.accuracy * 100).toFixed(2)}%)`);
    console.log(`Draws:      ${bestByAccuracy.drawStats.correct}/${bestByAccuracy.drawStats.total} correct (${(bestByAccuracy.drawStats.accuracy * 100).toFixed(2)}%)`);
    
    printConfusionMatrix(bestByAccuracy.confusionMatrix);
    printDerivedMetrics(bestByAccuracy.derivedMetrics);
    
    // ERROR ANALYSIS
    printErrorAnalysis(bestByAccuracy.predictions);

    // Show top 10 for each metric
    console.log("\n=== TOP 10 BY ACCURACY ===");
    topByAccuracy.forEach((r, i) => {
      console.log(`${i + 1}. ${(r.accuracy * 100).toFixed(2)}% - elo=${r.params.initialElo}, K=${r.params.baseK_Regular}, sf=${r.params.eloScalingFactor}, C_draw=${r.params.C_draw}, S_draw=${r.params.S_draw}, W_forfeit=${r.params.W_forfeit}, V_threshold=${r.params.V_threshold}`);
    });

    console.log("\n=== TOP 10 BY BRIER SCORE ===");
    topByBrier.forEach((r, i) => {
      console.log(`${i + 1}. ${r.brierScore.toFixed(4)} - elo=${r.params.initialElo}, K=${r.params.baseK_Regular}, sf=${r.params.eloScalingFactor}, C_draw=${r.params.C_draw}, S_draw=${r.params.S_draw}, W_forfeit=${r.params.W_forfeit}, V_threshold=${r.params.V_threshold}`);
    });

    // Save best predictions
    const bestPredictionsPath = path.join(outputDir, "best_accuracy_predictions.csv");
    fs.writeFileSync(bestPredictionsPath, predictionsToCSV(bestByAccuracy.predictions, bestByAccuracy.params));
    console.log(`\nSaved best accuracy predictions to ${bestPredictionsPath}`);

  } else {
    // Single experiment with default params
    console.log("Running single experiment with default parameters (v1.1)...");
    const result = runExperiment(DEFAULT_PARAMS, matches, historicalStats);

    const csvPath = path.join(outputDir, "predictions.csv");
    fs.writeFileSync(csvPath, predictionsToCSV(result.predictions, DEFAULT_PARAMS));

    console.log(`\nResults (v1.1):`);
    console.log(`  Matches: ${result.predictions.length}`);
    console.log(`  Voided Matches (Double Forfeits): ${result.voidedMatches}`);
    console.log(`  Single Forfeits (counted as wins): ${result.singleForfeits}`);
    console.log(`  Overall Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
    console.log(`  Regular Match Accuracy (no draws): ${(result.regularMatchAccuracy * 100).toFixed(2)}%`);
    console.log(`  Brier Score: ${result.brierScore.toFixed(4)}`);
    console.log(`  Log Loss: ${result.logLoss.toFixed(4)}`);
    console.log(`\nPer-Outcome Breakdown:`);
    console.log(`  Home Wins:  ${result.homeWinStats.correct}/${result.homeWinStats.total} correct (${(result.homeWinStats.accuracy * 100).toFixed(2)}%)`);
    console.log(`  Away Wins:  ${result.awayWinStats.correct}/${result.awayWinStats.total} correct (${(result.awayWinStats.accuracy * 100).toFixed(2)}%)`);
    console.log(`  Draws:      ${result.drawStats.correct}/${result.drawStats.total} correct (${(result.drawStats.accuracy * 100).toFixed(2)}%)`);
    
    printConfusionMatrix(result.confusionMatrix);
    printDerivedMetrics(result.derivedMetrics);
    
    // ERROR ANALYSIS
    printErrorAnalysis(result.predictions);
    
    console.log(`Saved predictions to ${csvPath}`);
  }

  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error("Error:", err);
  process.exit(1);
}
