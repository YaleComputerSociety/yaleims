// Matches: matches/seasons/{seasonId}/{matchId}.
import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import { WithId, isNotFound, withId } from "./util";

export interface MatchParticipant {
  email: string;
  name?: string;
  firstname?: string;
  lastname?: string;
}

/**
 * A match doc. Old docs also hold frozen odds/betting fields
 * (`*_odds`, `*_volume`, `predictions`), not typed here.
 */
export interface MatchDoc {
  /** Numeric id; overrides the doc id in API responses. */
  id: number;
  sport: string;
  type: string;
  home_college: string;
  away_college: string;
  home_college_score: number | null;
  away_college_score: number | null;
  home_college_participants?: MatchParticipant[];
  away_college_participants?: MatchParticipant[];
  winner: string | null;
  forfeit: boolean | null;
  timestamp: Timestamp;
  location?: string;
  location_extra?: string;
  division?: string;
  home_seed?: number;
  away_seed?: number;
  next_match_id?: number | string;
  next_match_loser_id?: number | string;
  playoff_bracket_slot?: number;
  tournament_id?: string;
  tournament_name?: string;
}

export async function getMatch(
  seasonId: string,
  matchId: string | number
): Promise<MatchDoc | null> {
  const snap = await adminDb.doc(paths.match(seasonId, matchId)).get();
  return snap.exists ? (snap.data() as MatchDoc) : null;
}

/** Updates fields of an existing match. Returns false if it doesn't exist. */
export async function updateMatch(
  seasonId: string,
  matchId: string | number,
  fields: Partial<MatchDoc>
): Promise<boolean> {
  try {
    await adminDb.doc(paths.match(seasonId, matchId)).update(fields);
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}

/** Matches that have started but have no winner yet, oldest first. */
export async function listUnscoredPastMatches(
  seasonId: string,
  now: Date
): Promise<WithId<MatchDoc>[]> {
  const snap = await adminDb
    .collection(paths.matches(seasonId))
    .where("winner", "==", null)
    .where("timestamp", "<", now)
    .orderBy("timestamp", "asc")
    .get();
  return snap.docs.map((d) => withId<MatchDoc>(d));
}

/**
 * A college's next unplayed matches (no winner, starting after `now`),
 * soonest first: up to `limitPerSide` home and up to `limitPerSide` away.
 */
export async function listUpcomingCollegeMatches(
  seasonId: string,
  college: string,
  now: Date,
  limitPerSide: number
): Promise<MatchDoc[]> {
  const side = (field: "home_college" | "away_college") =>
    adminDb
      .collection(paths.matches(seasonId))
      .where(field, "==", college)
      .where("winner", "==", null)
      .where("timestamp", ">", now)
      .orderBy("timestamp", "asc")
      .limit(limitPerSide)
      .get();
  const [home, away] = await Promise.all([side("home_college"), side("away_college")]);
  return [...home.docs, ...away.docs]
    .map((d) => d.data() as MatchDoc)
    .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
}
