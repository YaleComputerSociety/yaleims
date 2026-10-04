// Matches: matches/seasons/{seasonId}/{matchId}.
import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import { isNotFound } from "./util";

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
