// recalcOdds.ts
// Shared helpers to recalculate Elo-based odds and write them to match docs.
import admin from "./firebaseAdmin.js";
import { hybridOddsCalculator } from "./elo_odds_calculator.js";
import { Filter } from "firebase-admin/firestore";

const db = admin.firestore();

/**
 * Recalculate odds for a single match and write them to the match doc.
 * Returns the computed odds.
 */
export async function recalcOddsForMatch(
  matchRef: FirebaseFirestore.DocumentReference,
  matchData: {
    home_college: string;
    away_college: string;
    sport: string;
    home_volume?: number;
    away_volume?: number;
    draw_volume?: number;
  },
  season: string
): Promise<{
  home_college_odds: number;
  away_college_odds: number;
  draw_odds: number;
}> {
  const odds = await hybridOddsCalculator(
    matchData.home_college,
    matchData.away_college,
    matchData.sport,
    season,
    {
      team1: matchData.home_volume ?? 0,
      team2: matchData.away_volume ?? 0,
      draw: matchData.draw_volume ?? 0,
    }
  );

  const result = {
    home_college_odds: odds.team1Win,
    away_college_odds: odds.team2Win,
    draw_odds: odds.draw,
  };

  await matchRef.update(result);
  return result;
}

/**
 * After scoring a match (and updating Elo), recalculate odds for all unscored
 * matches in the same sport that involve either team whose Elo just changed.
 *
 * Returns the number of matches updated.
 */
export async function recalcOddsForAffectedMatches(
  season: string,
  sport: string,
  team1: string,
  team2: string
): Promise<number> {
  const baseRef = db
    .collection("matches")
    .doc("seasons")
    .collection(season);

  // Find unscored matches in this sport involving either team
  const snap = await baseRef
    .where("sport", "==", sport)
    .where("winner", "==", null)
    .where(
      Filter.or(
        Filter.where("home_college", "==", team1),
        Filter.where("away_college", "==", team1),
        Filter.where("home_college", "==", team2),
        Filter.where("away_college", "==", team2)
      )
    )
    .get();

  if (snap.empty) return 0;

  const updates = snap.docs.map(async (doc) => {
    const data = doc.data();
    // Skip TBD matches
    if (!data.home_college || !data.away_college) return;
    if (data.home_college === "TBD" || data.away_college === "TBD") return;

    await recalcOddsForMatch(doc.ref, data as any, season);
  });

  await Promise.all(updates);
  return snap.size;
}
