// elo_system.ts
// -----------------------------------------------------------------------------
// PURPOSE
// - Read Elo ratings for a given season/sport/college from Firestore.
// - Update Elo ratings AFTER a match.
// - Keep team-level season stats in sync with match results.
// - Update sport-level aggregates (matches_total, matches_played, defaults, totals).
//
// FIRESTORE LAYOUT (must match initEloSeason.ts):
// elo/{season}/sports/{sport}                      -> sport-level stats
// elo/{season}/sports/{sport}/colleges/{college}   -> team-level stats
// -----------------------------------------------------------------------------
// TODO: Incorporate in upload matches and upload brackets - for each match, it gives the correct odds when added
// TODO: make sure that odds are not set for matches that are still TBD / not fully filled out yet
import admin from "./firebaseAdmin.js";

const db = admin.firestore();
const inc = admin.firestore.FieldValue.increment;

// -----------------------------------------------------------------------------
// CENTRALIZED ELO CONFIGURATION
// Optimized from 525,000 experiment grid search (67.96% accuracy, Feb 2026)
// -----------------------------------------------------------------------------
export const ELO_CONFIG = {
  initialElo: 850,
  baseK: { Regular: 24, Playoff: 36, Final: 48 } as Record<string, number>,
  eloScalingFactor: 275,
  defaultSportModifier: 0.9,
  sportModifiers: {} as Record<string, number>,
  C_draw: 0.12,
  S_draw: 0.0008,
  W_forfeit: 0.10,
  V_threshold: 500,
  maxVolWeight: 0.3,
  laplaceSmoothingThreshold: 5,
};

// result letters we store in `form`
type ResultLetter = "W" | "L" | "D" | "WF" | "LF";

// small helper to keep at most 5 recent results
const nextForm = (prev: unknown, letter: ResultLetter) => {
  const arr = Array.isArray(prev) ? [...prev] : [];
  arr.push(letter);
  if (arr.length > 5) arr.splice(0, arr.length - 5);
  return arr;
};

// --- 1. Read a team's Elo ---------------------------------------------------
async function getEloRating(
  college: string,
  sport: string,
  season: string
): Promise<number> {
  const snap = await db
    .collection("elo")
    .doc(season)
    .collection("sports")
    .doc(sport)
    .collection("colleges")
    .doc(college)
    .get();

  if (!snap.exists) {
    return ELO_CONFIG.initialElo;
  }
  const data = snap.data() as { elo_rating?: number };
  return data?.elo_rating ?? ELO_CONFIG.initialElo;
}

// --- 2. Elo math for non-forfeit matches -----------------------------------
function calculateNewRatingsFromElo(
  homeRating: number,
  awayRating: number,
  winner: string,
  homeTeam: string,
  awayTeam: string,
  matchType: "Regular" | "Playoff" | "Final",
  sport: string
): { newHomeRating: number; newAwayRating: number } {
  const sportModifier =
    ELO_CONFIG.sportModifiers[sport] ?? ELO_CONFIG.defaultSportModifier;
  const K = (ELO_CONFIG.baseK[matchType] ?? ELO_CONFIG.baseK.Regular) * sportModifier;

  // actual score from the match
  let homeActual: number;
  if (winner === "Draw") {
    homeActual = 0.5;
  } else if (winner === homeTeam) {
    homeActual = 1;
  } else {
    homeActual = 0;
  }
  const awayActual = 1 - homeActual;

  // expected score (standard Elo)
  const homeExpected =
    1 / (1 + 10 ** ((awayRating - homeRating) / ELO_CONFIG.eloScalingFactor));
  const awayExpected = 1 - homeExpected;

  return {
    newHomeRating: Math.round(homeRating + K * (homeActual - homeExpected)),
    newAwayRating: Math.round(awayRating + K * (awayActual - awayExpected)),
  };
}

// --- 3. Public: update Elo + stats after a match ---------------------------
export interface EloMatchResult {
  season: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  // college code of winner, or "Draw", or "Default"
  winner: string;
  matchType: "Regular" | "Playoff" | "Final";
  home_college_score?: number;
  away_college_score?: number;
  // if winner === "Default", tell us who actually forfeited
  forfeitingTeam?: string;
}

/**
 * Update both teams + sport aggregate to reflect a finished match.
 * - Double forfeit: match is VOID, no stats updated.
 * - Single forfeit: increment stats, do NOT change Elo.
 * - Normal match: update Elo, wins/losses/draws, scores, form.
 */
export async function updateEloRatings(
  match: EloMatchResult
): Promise<void> {
  const {
    season,
    sport,
    homeTeam,
    awayTeam,
    winner,
    matchType,
    home_college_score = 0,
    away_college_score = 0,
    forfeitingTeam,
  } = match;

  const seasonRef = db.collection("elo").doc(season);
  const sportRef = seasonRef.collection("sports").doc(sport);
  const homeRef = sportRef.collection("colleges").doc(homeTeam);
  const awayRef = sportRef.collection("colleges").doc(awayTeam);

  const [homeSnap, awaySnap] = await Promise.all([homeRef.get(), awayRef.get()]);
  const homeData = homeSnap.data() ?? {};
  const awayData = awaySnap.data() ?? {};

  const batch = db.batch();

  // --- CASE 0: DOUBLE FORFEIT (void match) ---------------------------------
  if (winner === "Default") {
    const forfeiter =
      forfeitingTeam && [homeTeam, awayTeam].includes(forfeitingTeam)
        ? forfeitingTeam
        : undefined;

    if (!forfeiter) {
      // Double forfeit: match is VOID, no stats updated, bets returned
      return;
    }
  }

  // --- CASE 1: SINGLE FORFEIT ----------------------------------------------
  if (winner === "Default") {
    const forfeiter = forfeitingTeam!;

    // Sport-level: increment matches_total only (not matches_played)
    batch.set(
      sportRef,
      {
        matches_total: inc(1),
        defaults: inc(1),
      },
      { merge: true }
    );

    // home
    batch.set(
      homeRef,
      {
        matches_total: inc(1),
        // matches_played NOT incremented - forfeit wasn't actually played
        defaults: forfeiter === homeTeam ? inc(1) : inc(0),
        wins: forfeiter === homeTeam ? inc(0) : inc(1),
        wins_by_forfeit: forfeiter === homeTeam ? inc(0) : inc(1),
        losses_by_forfeit: forfeiter === homeTeam ? inc(1) : inc(0),
        form: nextForm(
          homeData.form,
          forfeiter === homeTeam ? "LF" : "WF"
        ),
        // Forfeit scores are NOT added to totals — they skew avg point diff
      },
      { merge: true }
    );

    // away
    batch.set(
      awayRef,
      {
        matches_total: inc(1),
        // matches_played NOT incremented - forfeit wasn't actually played
        defaults: forfeiter === awayTeam ? inc(1) : inc(0),
        wins: forfeiter === awayTeam ? inc(0) : inc(1),
        wins_by_forfeit: forfeiter === awayTeam ? inc(0) : inc(1),
        losses_by_forfeit: forfeiter === awayTeam ? inc(1) : inc(0),
        form: nextForm(
          awayData.form,
          forfeiter === awayTeam ? "LF" : "WF"
        ),
        // Forfeit scores are NOT added to totals — they skew avg point diff
      },
      { merge: true }
    );

    await batch.commit();
    return; // no Elo movement on forfeits
  }

  // --- CASE 2: NORMAL / DRAW MATCH ----------------------------------------

  // Sport-level: increment both matches_total and matches_played
  batch.set(
    sportRef,
    {
      matches_total: inc(1),
      matches_played: inc(1),
      draws: inc(winner === "Draw" ? 1 : 0),
      total_points: inc(home_college_score + away_college_score),
      total_score_diff: inc(Math.abs(home_college_score - away_college_score)),
    },
    { merge: true }
  );

  // read current Elo (will be initialElo if team is new)
  const [homeElo, awayElo] = await Promise.all([
    getEloRating(homeTeam, sport, season),
    getEloRating(awayTeam, sport, season),
  ]);

  // new Elo after match
  const { newHomeRating, newAwayRating } = calculateNewRatingsFromElo(
    homeElo,
    awayElo,
    winner,
    homeTeam,
    awayTeam,
    matchType,
    sport
  );

  // form / counters
  const homeLetter: ResultLetter =
    winner === "Draw" ? "D" : winner === homeTeam ? "W" : "L";
  const awayLetter: ResultLetter =
    winner === "Draw" ? "D" : winner === awayTeam ? "W" : "L";

  // home doc update
  batch.set(
    homeRef,
    {
      elo_rating: newHomeRating,
      matches_total: inc(1),
      matches_played: inc(1),
      wins: inc(homeLetter === "W" ? 1 : 0),
      wins_by_play: inc(homeLetter === "W" ? 1 : 0),
      losses: inc(homeLetter === "L" ? 1 : 0),
      losses_by_play: inc(homeLetter === "L" ? 1 : 0),
      draws: inc(homeLetter === "D" ? 1 : 0),
      total_scored: inc(home_college_score),
      total_conceded: inc(away_college_score),
      form: nextForm(homeData.form, homeLetter),
    },
    { merge: true }
  );

  // away doc update
  batch.set(
    awayRef,
    {
      elo_rating: newAwayRating,
      matches_total: inc(1),
      matches_played: inc(1),
      wins: inc(awayLetter === "W" ? 1 : 0),
      wins_by_play: inc(awayLetter === "W" ? 1 : 0),
      losses: inc(awayLetter === "L" ? 1 : 0),
      losses_by_play: inc(awayLetter === "L" ? 1 : 0),
      draws: inc(awayLetter === "D" ? 1 : 0),
      total_scored: inc(away_college_score),
      total_conceded: inc(home_college_score),
      form: nextForm(awayData.form, awayLetter),
    },
    { merge: true }
  );

  // log the match for auditing
  const matchLogRef = sportRef.collection("matches").doc();
  batch.set(matchLogRef, {
    homeTeam,
    awayTeam,
    winner,
    matchType,
    home_college_score,
    away_college_score,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

// --- 4. Read-only helper for odds calculator -------------------------------
export async function getEloWinProbabilities(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  season: string
): Promise<{ PHome: number; PDraw: number; PAway: number }> {
  const [homeRating, awayRating] = await Promise.all([
    getEloRating(homeTeam, sport, season),
    getEloRating(awayTeam, sport, season),
  ]);

  const { C_draw, S_draw, eloScalingFactor } = ELO_CONFIG;

  // standard Elo expected score
  const Ea = 1 / (1 + 10 ** ((awayRating - homeRating) / eloScalingFactor));

  const diff = Math.abs(awayRating - homeRating);

  const PDraw = C_draw * Math.exp(-S_draw * diff);
  const PHome = (1 - PDraw) * Ea;
  const PAway = (1 - PDraw) * (1 - Ea);

  return { PHome, PDraw, PAway };
}
