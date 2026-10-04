// College standings per season: colleges/seasons/{seasonId}/{abbr}.
import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import { WithId, withId } from "./util";

/** A college's standing in one season; the doc id is its abbreviation. */
export interface CollegeStandingDoc {
  name: string;
  abbreviation: string;
  season: string;
  points: number;
  wins: number;
  losses: number;
  ties: number;
  forfeits: number;
  games: number;
  rank: number;
  prevRank: number;
  /** Date of the last rank snapshot, "d-m-yyyy". */
  today: string;
  migratedAt?: Timestamp;
}

/**
 * A season's standings: most points first, then most wins, then doc id
 * descending (Firestore's implicit tiebreak for that ordering). Sorted here
 * rather than by the query, so no per-season composite index is needed.
 */
export async function listCollegeStandings(
  seasonId: string
): Promise<WithId<CollegeStandingDoc>[]> {
  const snap = await adminDb.collection(paths.collegeStandings(seasonId)).get();
  return snap.docs
    .map((d) => withId<CollegeStandingDoc>(d))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
    );
}
