// Matches (games): seasons/{seasonId}/matches/{matchId}. Migrated games keep
// their number as the doc id; new ones get auto ids (D28). Byes are bracket
// slots, not games.
import "server-only";
import type { DocumentReference, Query } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { MatchDoc, MatchStatus, WithId } from "@/types/firestore";
import { listSeasons } from "./seasons";
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

/** How many of a season's games pass `filter`. */
export async function countSeasonMatches(
  seasonId: string,
  filter: SeasonMatchFilter,
  order: SortOrder
): Promise<number> {
  const snap = await seasonMatchQuery(seasonId, filter, order).count().get();
  return snap.data().count;
}

/** A season's games that pass `filter`, sorted by start: all of them, or one page. */
export async function listSeasonMatches(
  seasonId: string,
  filter: SeasonMatchFilter,
  order: SortOrder,
  page?: { offset: number; limit: number }
): Promise<WithId<MatchDoc>[]> {
  let query = seasonMatchQuery(seasonId, filter, order);
  if (page) query = query.offset(page.offset).limit(page.limit);
  const snap = await query.get();
  return snap.docs.map((d) => withId<MatchDoc>(d));
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

/**
 * One page of the played games (status final) of every season, sorted by
 * start, and how many there are in all. Each season runs the same filtered
 * query, limited to the games up to the page's end; the results are merged.
 * So a page reads about seasons × (offset + limit) games. Not a
 * collection-group query: the id "matches" is shared with Elo and the old
 * tree (lib/paths.ts).
 */
export async function listPlayedMatches(
  filter: Omit<SeasonMatchFilter, "status">,
  order: SortOrder,
  offset: number,
  limit: number
): Promise<{ items: WithId<MatchDoc>[]; total: number }> {
  const seasons = await listSeasons();
  const perSeason = await Promise.all(
    seasons.map(async ({ id }) => {
      const query = seasonMatchQuery(id, { ...filter, status: "final" }, order);
      const [games, count] = await Promise.all([query.limit(offset + limit).get(), query.count().get()]);
      return { games: games.docs.map((d) => withId<MatchDoc>(d)), total: count.data().count };
    })
  );
  // Equal start times: by season, then by id, the way each season's query breaks ties.
  const sign = order === "asc" ? 1 : -1;
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const games = perSeason
    .flatMap((s) => s.games)
    .sort(
      (a, b) =>
        sign *
        (a.startsAt.toMillis() - b.startsAt.toMillis() || compare(a.seasonId, b.seasonId) || compare(a.id, b.id))
    );
  return {
    items: games.slice(offset, offset + limit),
    total: perSeason.reduce((sum, s) => sum + s.total, 0),
  };
}
