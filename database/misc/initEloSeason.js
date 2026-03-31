// initEloSeason.js
// -----------------------------------------------------------------------------
// Pre-populate Firestore with a season, its sports, and all colleges
// so Elo updates and odds calculations can assume the docs exist.
//
// Uses Firebase Web SDK (same pattern as other misc/ scripts).
//
// FIRESTORE SHAPE:
// elo/{seasonId}
//   └─ sports/{sportName}
//        ├─ (sport-level: matches_total, matches_played, draws, defaults, ...)
//        └─ colleges/{collegeCode}
//             └─ (team-level: elo_rating, matches_total, matches_played, wins, ...)
//
// Must stay in sync with:
//   - elo_system.ts     (ELO_CONFIG, updateEloRatings)
//   - elo_odds_calculator.ts (hybridOddsCalculator reads matches_total + defaults)
// -----------------------------------------------------------------------------

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4ja4JXughIwxLPEt42mNClHH53sN0D6Q",
  authDomain: "yims-125a2.firebaseapp.com",
  projectId: "yims-125a2",
  storageBucket: "yims-125a2.appspot.com",
  messagingSenderId: "846558223250",
  appId: "1:846558223250:web:38c418708cc6f04e003f4b",
};

initializeApp(firebaseConfig);
const db = getFirestore();

// --- ELO_CONFIG (must match elo_system.ts) ---
const ELO_CONFIG = {
  initialElo: 850,
};

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
];

const COLLEGES = [
  "BF", "BK", "BR", "DC", "ES", "GH", "JE",
  "MC", "PM", "PC", "SM", "SY", "TC", "TD",
];

// Must match fields read/written by updateEloRatings and hybridOddsCalculator
const DEFAULT_COLLEGE_STATE = {
  elo_rating: ELO_CONFIG.initialElo,
  matches_total: 0,     // All non-void matches (forfeits + regular)
  matches_played: 0,    // Regular matches only (excludes forfeits)
  wins: 0,              // Total wins (play + forfeit)
  wins_by_play: 0,      // Wins from actual play
  wins_by_forfeit: 0,   // Wins via opponent forfeit
  losses: 0,            // Total losses (play + forfeit)
  losses_by_play: 0,    // Losses from actual play
  losses_by_forfeit: 0, // Losses via own forfeit
  draws: 0,
  defaults: 0,          // Times this team forfeited (used by forfeit tipping)
  total_scored: 0,      // Points scored in played matches only
  total_conceded: 0,    // Points conceded in played matches only
  form: [],             // Last 5: "W", "L", "D", "WF", "LF"
};

// Must match fields written by updateEloRatings
const DEFAULT_SPORT_STATE = {
  matches_total: 0,     // All non-void matches (forfeits + regular)
  matches_played: 0,    // Regular matches only (excludes forfeits)
  draws: 0,
  defaults: 0,          // Single forfeit count
  total_points: 0,
  total_score_diff: 0,
};

async function initEloSeason(seasonId) {
  const batch = writeBatch(db);

  // Create/merge the season doc
  const seasonRef = doc(collection(db, "elo"), seasonId);
  batch.set(seasonRef, {}, { merge: true });

  for (const sport of SPORTS) {
    // /elo/{seasonId}/sports/{sport}
    const sportRef = doc(collection(seasonRef, "sports"), sport);
    batch.set(
      sportRef,
      { name: sport, ...DEFAULT_SPORT_STATE },
      { merge: true }
    );

    // /elo/{seasonId}/sports/{sport}/colleges/{college}
    for (const college of COLLEGES) {
      const collegeRef = doc(collection(sportRef, "colleges"), college);
      batch.set(
        collegeRef,
        { code: college, ...DEFAULT_COLLEGE_STATE },
        { merge: true }
      );
    }
  }

  await batch.commit();
  console.log(`Initialized season ${seasonId} (initial Elo: ${ELO_CONFIG.initialElo})`);
}

// Run:
initEloSeason("2025-2026");
