// Matches (games): seasons/{seasonId}/matches/{matchId}. Migrated games keep
// their number as the doc id; new ones get auto ids (D28). Byes are bracket
// slots, not games.
import "server-only";
import type { DocumentReference, Query } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { MatchDoc, MatchStatus, WithId } from "@/types/firestore";
import { withId } from "./util";

export function matchRef(seasonId: string, matchId: string): DocumentReference<MatchDoc> {
  return adminDb.doc(paths.match(seasonId, matchId)) as DocumentReference<MatchDoc>;
}

/** A ref for a new game, with an auto id. */
export function newMatchRef(seasonId: string): DocumentReference<MatchDoc> {
  return adminDb.collection(paths.matches(seasonId)).doc() as DocumentReference<MatchDoc>;
}

export async function getMatch(seasonId: string, matchId: string): Promise<MatchDoc | null> {
  const snap = await matchRef(seasonId, matchId).get();
  return snap.exists ? snap.data()! : null;
}

/** The games with these ids (missing ones left out), by id. */
export async function getMatches(seasonId: string, matchIds: string[]): Promise<Map<string, MatchDoc>> {
  if (matchIds.length === 0) return new Map();
  const snaps = await adminDb.getAll(...matchIds.map((id) => matchRef(seasonId, id)));
  return new Map(snaps.filter((s) => s.exists).map((s) => [s.id, s.data() as MatchDoc]));
}

export interface SeasonMatchFilter {
  /** Home or away college. */
  collegeId?: string;
  sportId?: string;
  status?: MatchStatus;
  /** Starts at or after. */
  from?: Date;
  /** Starts at or before. */
  to?: Date;
}

export type SortOrder = "asc" | "desc";

function seasonMatchQuery(seasonId: string, filter: SeasonMatchFilter, order: SortOrder): Query {
  let query: Query = adminDb.collection(paths.matches(seasonId)).orderBy("startsAt", order);
  if (filter.collegeId) query = query.where("collegeIds", "array-contains", filter.collegeId);
  if (filter.sportId) query = query.where("sportId", "==", filter.sportId);
  if (filter.status) query = query.where("status", "==", filter.status);
  if (filter.from) query = query.where("startsAt", ">=", filter.from);
  if (filter.to) query = query.where("startsAt", "<=", filter.to);
  return query;
}

/** A season's games that pass `filter`, sorted by start. */
export async function listSeasonMatches(
  seasonId: string,
  filter: SeasonMatchFilter,
  order: SortOrder,
): Promise<WithId<MatchDoc>[]> {
  const snap = await seasonMatchQuery(seasonId, filter, order).get();
  return snap.docs.map((d) => withId<MatchDoc>(d));
}

/** One numbered page and the filtered total, from a single season. */
export async function listSeasonMatchPage(
  seasonId: string,
  filter: SeasonMatchFilter,
  order: SortOrder,
  { page, pageSize }: { page: number; pageSize: number },
): Promise<{ items: WithId<MatchDoc>[]; total: number }> {
  const query = seasonMatchQuery(seasonId, filter, order);
  const offset = (page - 1) * pageSize;
  const count = query.count().get().then((snap) => snap.data().count);
  const readPage = async () => {
    // Read page one in parallel with the count. Later pages can skip the
    // offset query entirely when they are beyond the end of the results.
    if (offset > 0 && offset >= (await count)) return [];
    const snap = await query.offset(offset).limit(pageSize).get();
    return snap.docs.map((d) => withId<MatchDoc>(d));
  };
  const [items, total] = await Promise.all([readPage(), count]);
  return { items, total };
}

/**
 * When the season's first game starts, counting only games from `from` on
 * (null: none yet). The range also skips games without a time.
 */
export async function firstMatchStart(seasonId: string, from: Date): Promise<Date | null> {
  const snap = await adminDb
    .collection(paths.matches(seasonId))
    .where("startsAt", ">=", from)
    .orderBy("startsAt", "asc")
    .limit(1)
    .get();
  return snap.empty ? null : withId<MatchDoc>(snap.docs[0]).startsAt.toDate();
}
