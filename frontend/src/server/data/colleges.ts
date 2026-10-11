// College standings per season: colleges/seasons/{seasonId}/{abbr}.
import "server-only";
import type { DocumentReference, Timestamp } from "firebase-admin/firestore";
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

/** A college's standing doc, for services that change it in a transaction. */
export function collegeStandingRef(
  seasonId: string,
  abbr: string
): DocumentReference<CollegeStandingDoc> {
  return adminDb.doc(paths.collegeStanding(seasonId, abbr)) as DocumentReference<CollegeStandingDoc>;
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

/** "d-m-yyyy" in the server's time zone: the format of `today`. */
function rankDay(now: Date): string {
  return `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
}

/**
 * Re-ranks a season's colleges: most points, then most wins, then doc id.
 * The first re-rank of a day also keeps each college's previous rank in
 * prevRank (the leaderboard's rank change).
 */
export async function recalculateRanks(seasonId: string, now = new Date()): Promise<void> {
  const standings = adminDb.collection(paths.collegeStandings(seasonId));
  const today = rankDay(now);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(standings);
    const ranked = snap.docs
      .map((d) => ({ ref: d.ref, standing: d.data() as CollegeStandingDoc }))
      .sort(
        (a, b) =>
          (b.standing.points || 0) - (a.standing.points || 0) ||
          (b.standing.wins || 0) - (a.standing.wins || 0)
      );
    ranked.forEach(({ ref, standing }, i) => {
      tx.update(
        ref,
        standing.today !== today
          ? { today, prevRank: standing.rank, rank: i + 1 }
          : { rank: i + 1 }
      );
    });
  });
}
