import admin from "./firebaseAdmin.js";

const inc = admin.firestore.FieldValue.increment;
const db = admin.firestore();

// Elo rating configuration
export const ELO_CONFIG = {
  K_FACTOR: {
    REGULAR: 32,      // Regular season matches
    PLAYOFF: 48,      // Playoff matches (higher weight)
    FINAL: 64,        // Championship matches (highest weight)
  },
  SPORT_MODIFIERS: {
    // Different sports may have different volatility
    "Soccer": 1.0,
    "Flag Football": 1.0,
    "Spikeball": 1.0,
    "Cornhole": 1.0,
    "Pickleball": 1.0,
    "Table Tennis": 1.0,
    "W-Hoops": 1.0,
    "M-Hoops": 1.0,
    "C-Hoops": 1.0,
    "Dodgeball": 1.0,
    "Broomball": 1.0,
    "Indoor Soccer": 1.0,
    "Volleyball": 1.0,
    "Badminton": 1.0,
  }
};


export interface EloMatchResult {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  winner: string; // college abbreviation or "Draw" or "Default"
  matchType: "Regular" | "Playoff" | "Final";
  timestamp: admin.firestore.Timestamp;
  home_college_score?: number;
  away_college_score?: number;
}

/**
 * Calculate new Elo ratings after a match
 * @param homeRating - Current home team rating
 * @param awayRating - Current away team rating
 * @param result - Match result (1 for home win, 0.5 for draw, 0 for away win)
 * @param kFactor - K-factor for this match
 * @returns Object with new ratings for both teams
 */
function calculateNewRatings(
  homeRating: number,
  awayRating: number,
  result: number, // 1 = home win, 0.5 = draw, 0 = away win
  kFactor: number
): { newHomeRating: number; newAwayRating: number } {
  const {Pwin: homeExpected, Pdraw: drawExpected, Ploss: awayExpected} = calculateExpectedScore(homeRating, awayRating);
  // TODO: Use drawExpected
  const homeActual = result;
  const awayActual = 1 - result; // If home gets 1, away gets 0; if home gets 0.5, away gets 0.5
  
  const newHomeRating = homeRating + kFactor * (homeActual - homeExpected);
  const newAwayRating = awayRating + kFactor * (awayActual - awayExpected);
  
  return {
    newHomeRating: Math.round(newHomeRating),
    newAwayRating: Math.round(newAwayRating)
  };
}

/**
 * Get K-factor based on match type and sport
 * @param matchType - Type of match (Regular, Playoff, Final)
 * @param sport - Sport name
 * @returns K-factor for this match
 */
function getKFactor(matchType: string, sport: string): number {
  const baseKFactor = ELO_CONFIG.K_FACTOR[matchType as keyof typeof ELO_CONFIG.K_FACTOR] || ELO_CONFIG.K_FACTOR.REGULAR;
  const sportModifier = ELO_CONFIG.SPORT_MODIFIERS[sport as keyof typeof ELO_CONFIG.SPORT_MODIFIERS] || 1.0;
  
  return Math.round(baseKFactor * sportModifier);
}

/**
 * Get Elo rating for a college in a specific sport
 * Assumes that Elo exists
 * @param college - College abbreviation
 * @param sport - Sport name
 * @returns Elo rating data
 */
async function getEloRating(
  college: string,
  sport: string,
  seasonId: string
): Promise<number> {
  const docSnap = await db
    .collection("elo").doc(seasonId)
    .collection("sports").doc(sport)
    .collection("colleges").doc(college)
    .get();

  // assuming it exists:
  return (docSnap.data() as { elo_rating: number }).elo_rating;
}

// Helper to cap form at 5 (FIFO)
const nextForm = (prev: unknown, letter: string) => {
  const arr = Array.isArray(prev) ? [...prev] : [];
  arr.push(letter);
  if (arr.length > 5) arr.splice(0, arr.length - 5);
  return arr;
};

/**
 * Update Elo ratings after a match result
 * @param matchResult - The match result data
 * @param matchId - Optional match ID for logging
 */
export async function updateEloRatings(matchResult: EloMatchResult, season: string): Promise<void> {
  const { homeTeam, awayTeam, sport, winner, matchType, home_college_score, away_college_score } = matchResult;
  
  // Skip Elo updates for forfeits (Default) - they don't reflect skill
  if (winner === "Default") {
    return;
  }
  
  // Determine match result (1 = home win, 0.5 = draw, 0 = away win)
  let result: number;
  if (winner === "Draw") {
    result = 0.5;
  } else if (winner === homeTeam) {
    result = 1;
  } else if (winner === awayTeam) {
    result = 0;
  } else {
    // Unknown winner, skip update
    return;
  }

  // Get current ratings
  const homeRating = await getEloRating(homeTeam, sport, season);
  const awayRating = await getEloRating(awayTeam, sport, season);

  // Calculate K-factor
  const kFactor = getKFactor(matchType, sport);
  
  // Calculate new ratings
  const { newHomeRating, newAwayRating } = calculateNewRatings(
    homeRating,
    awayRating,
    result,
    kFactor
  );
  
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Refs for new structure
  const seasonRef = db.collection("elo").doc(season);
  const sportRef = seasonRef.collection("sports").doc(sport);
  const homeRef = sportRef.collection("colleges").doc(homeTeam);
  const awayRef = sportRef.collection("colleges").doc(awayTeam);

  // Read current docs so we can update "form" (keep last 5)
  const [homeSnap, awaySnap] = await Promise.all([homeRef.get(), awayRef.get()]);
  const homeData = (homeSnap.exists ? homeSnap.data() : {}) as { form?: string[] };
  const awayData = (awaySnap.exists ? awaySnap.data() : {}) as { form?: string[] };

  // Result letters for form / counters
  const homeLetter = winner === "Draw" ? "D" : winner === homeTeam ? "W" : "L";
  const awayLetter = winner === "Draw" ? "D" : winner === awayTeam ? "W" : "L";

  // Scores (support either naming you use)
  const homeScore = home_college_score ?? 0;
  const awayScore = away_college_score ?? 0;

  // Build increments
  const homeWins = homeLetter === "W" ? 1 : 0;
  const homeLosses = homeLetter === "L" ? 1 : 0;
  const homeDraws = homeLetter === "D" ? 1 : 0;

  const awayWins = awayLetter === "W" ? 1 : 0;
  const awayLosses = awayLetter === "L" ? 1 : 0;
  const awayDraws = awayLetter === "D" ? 1 : 0;

  const batch = db.batch();

  // HOME updates
  batch.set(
    homeRef,
    {
      elo_rating: newHomeRating,
      matches_played: inc(1),
      season_wins: inc(homeWins),
      season_losses: inc(homeLosses),
      season_draws: inc(homeDraws),
      // if you track defaults here, add: season_defaults: inc(winner === "Default" ? 1 : 0),
      total_scored: inc(homeScore),
      total_conceded: inc(awayScore),
      form: nextForm(homeData?.form, homeLetter),
      lastUpdated: now,
    },
    { merge: true }
  );

  // AWAY updates
  batch.set(
    awayRef,
    {
      elo_rating: newAwayRating,
      matches_played: inc(1),
      season_wins: inc(awayWins),
      season_losses: inc(awayLosses),
      season_draws: inc(awayDraws),
      total_scored: inc(awayScore),
      total_conceded: inc(homeScore),
      form: nextForm(awayData?.form, awayLetter),
      lastUpdated: now,
    },
    { merge: true }
  );

  // SPORT updates
  batch.set(
    sportRef,
    {
      matches_played: inc(1),
      draws: inc(winner === "Draw" ? 1 : 0),
      defaults: inc(winner === "Default" ? 1 : 0),
      total_points: inc(homeScore + awayScore), // will divide later
      total_score_diff: inc(Math.abs(homeScore - awayScore)), // will divide later
    },
    { merge: true }
  );

  await batch.commit();
}

/**
 * Get Elo-based win probabilities for a match
 * @param homeTeam - Home team abbreviation
 * @param awayTeam - Away team abbreviation
 * @param sport - Sport name
 * @returns Object with win probabilities for home, away, and draw
 */
export async function getEloWinProbabilities(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  season: string
): Promise<{ PHome: number; PDraw: number; PAway: number }> {
  const homeRating = await getEloRating(homeTeam, sport, season);
  const awayRating = await getEloRating(awayTeam, sport, season);

  const Ea = 1 / (1 + 10 ** ((awayRating - homeRating) / 400));

  const Dmax = 0.1;   // TODO: base draw rate
  const k = 0.002;    // TODO: sensitivity to rating difference
  const diff = Math.abs(awayRating - homeRating);

  const PDraw = Dmax * Math.exp(-k * diff);
  const PHome = (1 - PDraw) * Ea;
  const PAway = (1 - PDraw) * (1 - Ea);

  return { PHome, PDraw, PAway};
}
