// firebase-web.js
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

const SPORTS = [
  "Soccer",
  "Flag Football",
  "Spikeball",
  "Cornhole",
  "Pickleball",
  "Table Tennis",
  "W-Hoops",
  "M-Hoops",
  "C-Hoops",
  "Dodgeball",
  "Broomball",
  "Indoor Soccer",
  "Volleyball",
  "Badminton",
];

const COLLEGES = ["BF", "BK", "MY", "TD", "BR", "DC", "ES", "GH", "JE", "MC", "PC", "SM", "SY", "TC"];

const DEFAULT_COLLEGE_STATE = {
  elo_rating: 1000,
  matches_played: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  defaults: 0,
  total_scored: 0,
  total_conceded: 0,
  form: [], // keep last 5 later
};

const DEFAULT_SPORT_STATE = {
  matches_played: 0,
  total_score_diff: 0,
  total_points: 0,
  draws: 0,
  defaults: 0,
};

async function initEloSeason(seasonId) {
  const batch = writeBatch(db);

  // Create/merge the season doc (can also hold metadata)
  const seasonRef = doc(collection(db, "elo"), seasonId);
  batch.set(seasonRef, {}, { merge: true });

  for (const sport of SPORTS) {
    // /elo/{seasonId}/sports/{sport}
    const sportRef = doc(collection(seasonRef, "sports"), sport);
    batch.set(sportRef, { name: sport }, { merge: true });

    // /elo/{seasonId}/sports/{sport}/colleges/{college}
    for (const college of COLLEGES) {
      const collegeRef = doc(collection(sportRef, "colleges"), college);
      batch.set(
        collegeRef,
        { code: college, ...DEFAULT_COLLEGE_STATE },
        { merge: true }
      );
    }

    // Add/merge sport-level aggregate defaults
    batch.set(sportRef, { ...DEFAULT_SPORT_STATE }, { merge: true });
  }

  await batch.commit();
}

// Example usage:
initEloSeason("2025-2026");
