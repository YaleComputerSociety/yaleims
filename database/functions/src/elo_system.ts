// elo_system.ts
// -----------------------------------------------------------------------------
// PURPOSE
// - Read Elo ratings for a given season/sport/college from Firestore.
// - Update Elo ratings AFTER a match.
// - Keep team-level season stats in sync with match results.
// - Update sport-level aggregates (matches_played, draws, defaults, totals).
//
// FIRESTORE LAYOUT (must match initEloSeason.ts):
// elo/{season}/sports/{sport}                      -> sport-level stats
// elo/{season}/sports/{sport}/colleges/{college}   -> team-level stats
// -----------------------------------------------------------------------------

import admin from "./firebaseAdmin.js";

const db = admin.firestore();
const inc = admin.firestore.FieldValue.increment;

// result letters we store in `form`
type ResultLetter = "W" | "L" | "D" | "F";

// small helper to keep at most 5 recent results
const nextForm = (prev: unknown, letter: ResultLetter) => {
  const arr = Array.isArray(prev) ? [...prev] : [];
  arr.push(letter);
  if (arr.length > 5) arr.splice(0, arr.length - 5);
  return arr;
};

// --- 1. Read a team's Elo (default 1000 to match your seeding) -------------
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
    return 1000;
  }
  const data = snap.data() as { elo_rating?: number };
  return data?.elo_rating ?? 1000;
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
  // basic K-factors — you can move these to a config
  const baseKByType: Record<string, number> = {
    Regular: 32,
    Playoff: 48,
    Final: 64,
  };
  const sportModifier = 1.0; // plug in per-sport volatility if you want
  const K = (baseKByType[matchType] ?? 32) * sportModifier;

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
  const homeExpected = 1 / (1 + 10 ** ((awayRating - homeRating) / 400));
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
 * - Forfeits: increment defaults, do NOT change Elo.
 * - Normal match: update Elo, wins/losses/draws, scores, form.
 * - Sport always gets matches_played incremented.
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

  // sport-level stats ALWAYS updated
  batch.set(
    sportRef,
    {
      matches_played: inc(1),
      draws: inc(winner === "Draw" ? 1 : 0),
      defaults: inc(winner === "Default" ? 1 : 0),
      total_points: inc(home_college_score + away_college_score),
      total_score_diff: inc(Math.abs(home_college_score - away_college_score)),
    },
    { merge: true }
  );

  // --- CASE 1: FORFEIT -----------------------------------------------------
  if (winner === "Default") {
    const forfeiter =
      forfeitingTeam && [homeTeam, awayTeam].includes(forfeitingTeam)
        ? forfeitingTeam
        : undefined;

    // home
    batch.set(
      homeRef,
      {
        matches_played: inc(1),
        defaults: forfeiter === homeTeam ? inc(1) : inc(0),
        form: nextForm(
          homeData.form,
          forfeiter === homeTeam ? "F" : ("W" as ResultLetter)
        ),
        total_scored: inc(home_college_score),
        total_conceded: inc(away_college_score),
      },
      { merge: true }
    );

    // away
    batch.set(
      awayRef,
      {
        matches_played: inc(1),
        defaults: forfeiter === awayTeam ? inc(1) : inc(0),
        form: nextForm(
          awayData.form,
          forfeiter === awayTeam ? "F" : ("W" as ResultLetter)
        ),
        total_scored: inc(away_college_score),
        total_conceded: inc(home_college_score),
      },
      { merge: true }
    );

    await batch.commit();
    return; // no Elo movement on forfeits
  }

  // --- CASE 2: NORMAL / DRAW MATCH ----------------------------------------

  // read current Elo (will be 1000 if team is new)
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
      matches_played: inc(1),
      wins: inc(homeLetter === "W" ? 1 : 0),
      losses: inc(homeLetter === "L" ? 1 : 0),
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
      matches_played: inc(1),
      wins: inc(awayLetter === "W" ? 1 : 0),
      losses: inc(awayLetter === "L" ? 1 : 0),
      draws: inc(awayLetter === "D" ? 1 : 0),
      total_scored: inc(away_college_score),
      total_conceded: inc(home_college_score),
      form: nextForm(awayData.form, awayLetter),
    },
    { merge: true }
  );

  // OPTIONAL: log the match for auditing
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

  // standard Elo expected score
  const Ea = 1 / (1 + 10 ** ((awayRating - homeRating) / 400));

  // you can tune these 2 to change draw behavior
  const Dmax = 0.1;
  const k = 0.002;
  const diff = Math.abs(awayRating - homeRating);

  const PDraw = Dmax * Math.exp(-k * diff);
  const PHome = (1 - PDraw) * Ea;
  const PAway = (1 - PDraw) * (1 - Ea);

  return { PHome, PDraw, PAway };
}
