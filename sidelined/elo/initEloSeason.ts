// initEloSeason.ts
// -----------------------------------------------------------------------------
// PURPOSE
// Pre-populate Firestore with a season, its sports, and all colleges
// so later Elo updates and odds calculations can assume the docs exist.
//
// FIRESTORE SHAPE CREATED HERE
// elo/{seasonId}
//   └─ sports/{sportName}
//        ├─ (sport-level stats: matches_total, matches_played, draws, defaults, ...)
//        └─ colleges/{collegeCode}
//             └─ (team-level stats: elo_rating, matches_total, matches_played, wins, ...)
//
// Must stay in sync with elo_system.ts (ELO_CONFIG, updateEloRatings) and
// elo_odds_calculator.ts (hybridOddsCalculator reads matches_total + defaults).
// -----------------------------------------------------------------------------

import { pathToFileURL } from "url";
import admin from "./firebaseAdmin.js";
import { ELO_CONFIG } from "./elo_system.js";

const db = admin.firestore();

// All sports your app tracks
const SPORTS = [
  "Soccer",
  "Flag Football",
  "Spikeball",
  "Cornhole",
  "Pickleball",
  "Table Tennis",
  "WHoops",
  "MHoops",
  "CHoops",
  "Dodgeball",
  "Broomball",
  "Indoor Soccer",
  "Volleyball",
  "Badminton",
] as const;

// All colleges you want to initialize per sport
const COLLEGES = [
  "BF",
  "BK",
  "BR",
  "DC",
  "ES",
  "GH",
  "JE",
  "MC",
  "MY",
  "PC",
  "SM",
  "SY",
  "TC",
  "TD",
] as const;

type ResultLetter = "W" | "L" | "D" | "WF" | "LF";

// Starting values for each college in a sport
// Must match fields read/written by updateEloRatings and hybridOddsCalculator
const DEFAULT_COLLEGE_STATE = {
  elo_rating: ELO_CONFIG.initialElo,
  matches_total: 0,    // All non-void matches (forfeits + regular)
  matches_played: 0,   // Regular matches only (excludes forfeits)
  wins: 0,             // Total wins (play + forfeit)
  wins_by_play: 0,     // Wins from actual play
  wins_by_forfeit: 0,  // Wins via opponent forfeit
  losses: 0,           // Total losses (play + forfeit)
  losses_by_play: 0,   // Losses from actual play
  losses_by_forfeit: 0,// Losses via own forfeit
  draws: 0,
  defaults: 0,         // Times this team forfeited (used by forfeit tipping)
  total_scored: 0,     // Points scored in played matches only
  total_conceded: 0,   // Points conceded in played matches only
  form: [] as ResultLetter[],
};

// Starting values for each sport in a season
// Must match fields written by updateEloRatings
const DEFAULT_SPORT_STATE = {
  matches_total: 0,      // All non-void matches (forfeits + regular)
  matches_played: 0,     // Regular matches only (excludes forfeits)
  draws: 0,
  defaults: 0,           // Single forfeit count
  total_points: 0,
  total_score_diff: 0,
};

export async function initEloSeason(seasonId: string) {
  const batch = db.batch();

  // create the season doc (you can add metadata later)
  const seasonRef = db.collection("elo").doc(seasonId);
  batch.set(seasonRef, {}, { merge: true });

  for (const sport of SPORTS) {
    // sport-level doc
    const sportRef = seasonRef.collection("sports").doc(sport);
    batch.set(
      sportRef,
      {
        name: sport,
        ...DEFAULT_SPORT_STATE,
      },
      { merge: true }
    );

    // team-level docs under each sport
    for (const college of COLLEGES) {
      const collegeRef = sportRef.collection("colleges").doc(college);
      batch.set(
        collegeRef,
        {
          code: college,
          ...DEFAULT_COLLEGE_STATE,
        },
        { merge: true }
      );
    }
  }

  await batch.commit();
  console.log(`Initialized season ${seasonId} (initial Elo: ${ELO_CONFIG.initialElo})`);
}

// Run directly: npx tsx initEloSeason.ts 2026-2027 (never runs on import)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await initEloSeason(process.argv[2] || "2025-2026");
}
