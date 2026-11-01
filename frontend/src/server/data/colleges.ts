// Colleges and their standings, per season: seasons/{seasonId}/colleges/{collegeId}.
// The standing is a cache with one writer, scoring (services/standings.ts).
import "server-only";
import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { easternDate } from "@/lib/dates";
import { paths } from "@/lib/paths";
import type { CollegeDoc, WithId } from "@/types/firestore";
import { withId } from "./util";

export function collegeRef(seasonId: string, collegeId: string): DocumentReference<CollegeDoc> {
  return adminDb.doc(paths.college(seasonId, collegeId)) as DocumentReference<CollegeDoc>;
}

/** The season's colleges (id = abbreviation), unsorted. */
export async function listColleges(seasonId: string): Promise<WithId<CollegeDoc>[]> {
  const snap = await adminDb.collection(paths.colleges(seasonId)).get();
  return snap.docs.map((d) => withId<CollegeDoc>(d));
}

/**
 * A season's standings: most points first, then most wins, then id
 * descending (the order the leaderboard has always had).
 */
export async function listStandings(seasonId: string): Promise<WithId<CollegeDoc>[]> {
  return (await listColleges(seasonId)).sort(
    (a, b) => b.points - a.points || b.wins - a.wins || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  );
}

/**
 * Re-ranks a season's colleges: most points, then most wins. The first
 * re-rank of an (Eastern) day also keeps each college's previous rank in
 * prevRank (the leaderboard's rank change).
 */
export async function recalculateRanks(seasonId: string, now = new Date()): Promise<void> {
  const today = easternDate(now);
  const colleges = adminDb.collection(paths.colleges(seasonId));
  await adminDb.runTransaction(async (tx) => {
    const ranked = (await tx.get(colleges)).docs
      .map((d) => ({ ref: d.ref, college: d.data() as CollegeDoc }))
      .sort((a, b) => b.college.points - a.college.points || b.college.wins - a.college.wins);
    ranked.forEach(({ ref, college }, i) => {
      tx.update(
        ref,
        college.rankDate !== today
          ? { rankDate: today, prevRank: college.rank, rank: i + 1 }
          : { rank: i + 1 }
      );
    });
  });
}
