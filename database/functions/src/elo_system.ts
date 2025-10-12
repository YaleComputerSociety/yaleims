import admin from "./firebaseAdmin.js";

const db = admin.firestore();

// Elo rating configuration
export const ELO_CONFIG = {
  INITIAL_RATING: 1500,
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

export interface EloRating {
  college: string;
  sport: string;
  rating: number;
  gamesPlayed: number;
  lastUpdated: admin.firestore.Timestamp;
}

export interface EloMatchResult {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  winner: string; // college abbreviation or "Draw" or "Default"
  matchType: "Regular" | "Playoff" | "Final";
  timestamp: admin.firestore.Timestamp;
}

/**
 * Calculate the expected score for a team based on Elo ratings
 * @param teamRating - The Elo rating of the team
 * @param opponentRating - The Elo rating of the opponent
 * @returns Expected score (0 to 1)
 */
export function calculateExpectedScore(teamRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - teamRating) / 400));
}

/**
 * Calculate new Elo ratings after a match
 * @param homeRating - Current home team rating
 * @param awayRating - Current away team rating
 * @param result - Match result (1 for home win, 0.5 for draw, 0 for away win)
 * @param kFactor - K-factor for this match
 * @returns Object with new ratings for both teams
 */
export function calculateNewRatings(
  homeRating: number,
  awayRating: number,
  result: number, // 1 = home win, 0.5 = draw, 0 = away win
  kFactor: number
): { newHomeRating: number; newAwayRating: number } {
  const homeExpected = calculateExpectedScore(homeRating, awayRating);
  const awayExpected = calculateExpectedScore(awayRating, homeRating);
  
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
export function getKFactor(matchType: string, sport: string): number {
  const baseKFactor = ELO_CONFIG.K_FACTOR[matchType as keyof typeof ELO_CONFIG.K_FACTOR] || ELO_CONFIG.K_FACTOR.REGULAR;
  const sportModifier = ELO_CONFIG.SPORT_MODIFIERS[sport as keyof typeof ELO_CONFIG.SPORT_MODIFIERS] || 1.0;
  
  return Math.round(baseKFactor * sportModifier);
}

/**
 * Get or create Elo rating for a college in a specific sport
 * @param college - College abbreviation
 * @param sport - Sport name
 * @param year - Season year
 * @returns Elo rating data
 */
export async function getEloRating(college: string, sport: string, year: string): Promise<EloRating> {
  const eloRef = db
    .collection("elo_ratings")
    .doc("seasons")
    .collection(year)
    .doc(`${sport}_${college}`);
  
  const eloDoc = await eloRef.get();
  
  if (!eloDoc.exists) {
    // Create new Elo rating with initial value
    const initialRating: EloRating = {
      college,
      sport,
      rating: ELO_CONFIG.INITIAL_RATING,
      gamesPlayed: 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp
    };
    
    await eloRef.set(initialRating);
    return initialRating;
  }
  
  return eloDoc.data() as EloRating;
}

/**
 * Update Elo ratings after a match result
 * @param matchResult - The match result data
 * @param year - Season year
 * @param matchId - Optional match ID for logging
 */
export async function updateEloRatings(matchResult: EloMatchResult, year: string, matchId?: string): Promise<void> {
  const { homeTeam, awayTeam, sport, winner, matchType } = matchResult;
  
  // Skip Elo updates for forfeits (Default) - they don't reflect skill
  if (winner === "Default") {
    return;
  }
  
  // Get current ratings
  const homeRating = await getEloRating(homeTeam, sport, year);
  const awayRating = await getEloRating(awayTeam, sport, year);
  
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
  
  // Calculate K-factor
  const kFactor = getKFactor(matchType, sport);
  
  // Calculate new ratings
  const { newHomeRating, newAwayRating } = calculateNewRatings(
    homeRating.rating,
    awayRating.rating,
    result,
    kFactor
  );
  
  // Update ratings in Firestore
  const batch = db.batch();
  
  const homeEloRef = db
    .collection("elo_ratings")
    .doc("seasons")
    .collection(year)
    .doc(`${sport}_${homeTeam}`);
  
  const awayEloRef = db
    .collection("elo_ratings")
    .doc("seasons")
    .collection(year)
    .doc(`${sport}_${awayTeam}`);
  
  batch.update(homeEloRef, {
    rating: newHomeRating,
    gamesPlayed: admin.firestore.FieldValue.increment(1),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });
  
  batch.update(awayEloRef, {
    rating: newAwayRating,
    gamesPlayed: admin.firestore.FieldValue.increment(1),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });
  
  await batch.commit();

  // Log the change to history if matchId is provided
  if (matchId) {
    try {
      const historyRef = db.collection("elo_history").doc();
      await historyRef.set({
        matchId,
        homeTeam,
        awayTeam,
        sport,
        winner,
        homeRatingBefore: homeRating.rating,
        awayRatingBefore: awayRating.rating,
        homeRatingAfter: newHomeRating,
        awayRatingAfter: newAwayRating,
        homeChange: newHomeRating - homeRating.rating,
        awayChange: newAwayRating - awayRating.rating,
        matchType,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (historyError) {
      console.error("Error logging Elo history:", historyError);
      // Don't fail the main operation if history logging fails
    }
  }
}

/**
 * Get Elo-based win probabilities for a match
 * @param homeTeam - Home team abbreviation
 * @param awayTeam - Away team abbreviation
 * @param sport - Sport name
 * @param year - Season year
 * @returns Object with win probabilities for home, away, and draw
 */
export async function getEloWinProbabilities(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  year: string
): Promise<{ homeWin: number; awayWin: number; draw: number }> {
  const homeRating = await getEloRating(homeTeam, sport, year);
  const awayRating = await getEloRating(awayTeam, sport, year);
  
  // Calculate expected scores
  const awayExpected = calculateExpectedScore(awayRating.rating, homeRating.rating);
  
  // Add home field advantage (typically 30-50 Elo points)
  const homeFieldAdvantage = 40;
  const adjustedHomeExpected = calculateExpectedScore(homeRating.rating + homeFieldAdvantage, awayRating.rating);
  
  // Normalize probabilities to account for draws
  // In sports where draws are possible, we need to adjust the probabilities
  const totalExpected = adjustedHomeExpected + awayExpected;
  const drawProbability = 0.1; // Base draw probability (can be sport-specific)
  
  const homeWin = adjustedHomeExpected * (1 - drawProbability) / totalExpected;
  const awayWin = awayExpected * (1 - drawProbability) / totalExpected;
  const draw = drawProbability;
  
  return {
    homeWin: Math.max(0.05, Math.min(0.95, homeWin)), // Clamp between 5% and 95%
    awayWin: Math.max(0.05, Math.min(0.95, awayWin)),
    draw: Math.max(0.05, Math.min(0.2, draw)) // Draw probability between 5% and 20%
  };
}

/**
 * Bulk initialize Elo ratings for all colleges in a sport for a season
 * @param colleges - Array of college abbreviations
 * @param sport - Sport name
 * @param year - Season year
 */
export async function initializeEloRatings(colleges: string[], sport: string, year: string): Promise<void> {
  const batch = db.batch();
  
  for (const college of colleges) {
    const eloRef = db
      .collection("elo_ratings")
      .doc("seasons")
      .collection(year)
      .doc(`${sport}_${college}`);
    
    const initialRating: Omit<EloRating, 'lastUpdated'> = {
      college,
      sport,
      rating: ELO_CONFIG.INITIAL_RATING,
      gamesPlayed: 0
    };
    
    batch.set(eloRef, {
      ...initialRating,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  await batch.commit();
}

/**
 * Get all Elo ratings for a sport in a season
 * @param sport - Sport name
 * @param year - Season year
 * @returns Array of Elo ratings sorted by rating (descending)
 */
export async function getEloLeaderboard(sport: string, year: string): Promise<EloRating[]> {
  const eloQuery = db
    .collection("elo_ratings")
    .doc("seasons")
    .collection(year)
    .where("sport", "==", sport)
    .orderBy("rating", "desc");
  
  const snapshot = await eloQuery.get();
  return snapshot.docs.map(doc => doc.data() as EloRating);
}
