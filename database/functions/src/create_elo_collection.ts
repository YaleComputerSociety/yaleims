import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp();
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
  "Badminton"
] as const;
const COLLEGES = ["BF", "BK", "MY", "TD", "BR", "DC", "ES", "GH", "JE", "MC", "PC", "SM", "SY", "TC"] as const;

type ResultLetter = "W" | "L" | "D" | "F"; // F = default/forfeit (optional)

const DEFAULT_COLLEGE_STATE = {
  elo_rating: 1000,
  matches_played: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  defaults: 0,
  total_scored: 0,
  total_conceded: 0,
  form: [] as ResultLetter[], // keep last 5 later
};

const DEFAULT_SPORT_STATE = {
    matches_played: 0,
    total_score_diff: 0,
    total_points: 0,
    draws: 0,
    defaults: 0,
}

export async function initEloSeason(seasonId: string) {
  const batch = db.batch();

  // Create the season doc (can also hold metadata)
  const seasonRef = db.collection("elo").doc(seasonId);
  batch.set(
    seasonRef,
    { merge: true }
  );

  for (const sport of SPORTS) {
    const sportRef = seasonRef.collection("sports").doc(sport);
    batch.set(sportRef, { name: sport }, { merge: true });

    for (const college of COLLEGES) {
      const collegeRef = sportRef.collection("colleges").doc(college);
      batch.set(collegeRef, {
        code: college,
        ...DEFAULT_COLLEGE_STATE,
      });
    }
    
    batch.set(sportRef, {
      ...DEFAULT_SPORT_STATE,
    });
  }

  await batch.commit();
}

// TODO: initEloSeason("2025-2026");
