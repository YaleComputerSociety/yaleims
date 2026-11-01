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

/** Which part of the sorted results to read. Cursors are match ids. */
export type SeasonMatchPage =
  | { kind: "all" }
  | { kind: "offset"; offset: number; limit: number }
  | { kind: "after"; cursorId: string; limit: number }
  | { kind: "before"; cursorId: string; limit: number };

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

/** One page of a season's games, sorted by start. Null if the page's cursor game doesn't exist. */
export async function listSeasonMatches(
  seasonId: string,
  filter: SeasonMatchFilter,
  order: SortOrder,
  page: SeasonMatchPage
): Promise<WithId<MatchDoc>[] | null> {
  let query = seasonMatchQuery(seasonId, filter, order);
  if (page.kind === "after" || page.kind === "before") {
    const cursor = await adminDb.doc(paths.match(seasonId, page.cursorId)).get();
    if (!cursor.exists) return null;
    query =
      page.kind === "after"
        ? query.startAfter(cursor).limit(page.limit)
        : query.endBefore(cursor).limitToLast(page.limit);
  } else if (page.kind === "offset") {
    query = query.offset(page.offset).limit(page.limit);
  }
  const snap = await query.get();
  return snap.docs.map((d) => withId<MatchDoc>(d));
}

/** When the season's first game starts (null: no games yet). */
export async function firstMatchStart(seasonId: string): Promise<Date | null> {
  const snap = await adminDb.collection(paths.matches(seasonId)).orderBy("startsAt", "asc").limit(1).get();
  return snap.empty ? null : withId<MatchDoc>(snap.docs[0]).startsAt.toDate();
}

/** Games that have started but have no result yet, oldest first. */
export async function listUnscoredPastMatches(seasonId: string, now: Date): Promise<WithId<MatchDoc>[]> {
  const snap = await adminDb
    .collection(paths.matches(seasonId))
    .where("status", "==", "scheduled")
    .where("startsAt", "<", now)
    .orderBy("startsAt", "asc")
    .get();
  return snap.docs.map((d) => withId<MatchDoc>(d));
}

/** A college's next unplayed games (starting after `now`), soonest first: up to `limitPerSide` home and away. */
export async function listUpcomingCollegeMatches(
  seasonId: string,
  collegeId: string,
  now: Date,
  limitPerSide: number
): Promise<WithId<MatchDoc>[]> {
  const snap = await adminDb
    .collection(paths.matches(seasonId))
    .where("collegeIds", "array-contains", collegeId)
    .where("startsAt", ">", now)
    .orderBy("startsAt", "asc")
    .get();
  const upcoming = snap.docs.map((d) => withId<MatchDoc>(d)).filter((m) => m.status === "scheduled");
  const side = (key: "homeCollegeId" | "awayCollegeId") =>
    upcoming.filter((m) => m[key] === collegeId).slice(0, limitPerSide);
  return [...side("homeCollegeId"), ...side("awayCollegeId")].sort(
    (a, b) => a.startsAt.toMillis() - b.startsAt.toMillis()
  );
}

/** A game and the season it was read from. */
export type SeasonMatch = WithId<MatchDoc>;

/**
 * Played games (a result, started in [from, before)) of every season, sorted
 * by start; ties keep the seasons' order, then the id. One time-bounded query
 * per season; the rest is filtered in memory.
 */
export async function listPlayedMatchesAllSeasons(
  range: { from?: Date; before: Date },
  filter: Pick<SeasonMatchFilter, "collegeId" | "sportId">,
  order: SortOrder
): Promise<SeasonMatch[]> {
  const seasons = await listSeasons();
  const perSeason = await Promise.all(
    seasons.map(async ({ id: seasonId }) => {
      // A range query on one field returns startsAt asc, then doc id.
      let query: Query = adminDb.collection(paths.matches(seasonId)).where("startsAt", "<", range.before);
      if (range.from) query = query.where("startsAt", ">=", range.from);
      return (await query.get()).docs.map((d) => withId<MatchDoc>(d));
    })
  );
  const played = perSeason
    .flat()
    .filter(
      (m) =>
        m.status === "final" &&
        (!filter.collegeId || m.collegeIds.includes(filter.collegeId)) &&
        (!filter.sportId || m.sportId === filter.sportId)
    );
  const ms = (m: SeasonMatch) => m.startsAt.toMillis();
  // Stable sort: equal start times stay in the order read above.
  return played.sort((a, b) => (order === "asc" ? ms(a) - ms(b) : ms(b) - ms(a)));
}
