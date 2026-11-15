// Matches (games): seasons/{seasonId}/matches/{matchId}. Migrated games keep
// their number as the doc id; new ones get auto ids (D28). Byes are bracket
// slots, not games.
import "server-only";
import { Timestamp, type DocumentReference, type Query } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import type { MatchCursor } from "@/lib/api/matches";
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

/** The filter plus the favorites: games of any of these colleges, or of any of these sports (each up to 30). */
export interface MatchPageFilter extends SeasonMatchFilter {
  collegeIds?: string[];
  sportIds?: string[];
}

/**
 * `limit` games after `after` in `order`, and whether more follow. A college
 * list and a sport list can't be OR'ed in one Firestore query, so each reads
 * its own page from the same cursor and the pages are merged in list order,
 * each game once. The list order is start, then id, as Firestore's is.
 */
export async function listMatchPage(
  seasonId: string,
  { collegeIds, sportIds, ...filter }: MatchPageFilter,
  order: SortOrder,
  { limit, after }: { limit: number; after?: MatchCursor },
): Promise<{ items: WithId<MatchDoc>[]; more: boolean }> {
  const base = seasonMatchQuery(seasonId, filter, order);
  const lists = [
    collegeIds && base.where("collegeIds", "array-contains-any", collegeIds),
    sportIds && base.where("sportId", "in", sportIds),
  ].filter((q) => q !== undefined);
  const readPage = (query: Query) => {
    const ordered = query.orderBy("__name__", order);
    const from = after ? ordered.startAfter(Timestamp.fromMillis(after.startsAtMs), after.id) : ordered;
    return from.limit(limit + 1).get();
  };
  const snaps = await Promise.all((lists.length > 0 ? lists : [base]).map(readPage));
  const byId = new Map(snaps.flatMap((snap) => snap.docs).map((d) => [d.id, withId<MatchDoc>(d)]));
  const sign = order === "asc" ? 1 : -1;
  const byIdThen = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const games = [...byId.values()].sort(
    (a, b) => sign * (a.startsAt.toMillis() - b.startsAt.toMillis() || byIdThen(a.id, b.id)),
  );
  return { items: games.slice(0, limit), more: games.length > limit };
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
