// Matches: matches/seasons/{seasonId}/{matchId}.
import "server-only";
import {
  Filter,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Query,
  type Transaction,
} from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { MatchDoc, WithId } from "@/types/firestore";
import { isNotFound, withId } from "./util";

/**
 * Reserves `n` new match ids from counters/matches, which holds the last id
 * handed out (D22): returns the first, or null if the counter is missing or
 * malformed. Callers create the matches in the same transaction, with
 * tx.create, so an id that is somehow taken fails the transaction instead
 * of overwriting a match.
 */
export async function reserveMatchIds(tx: Transaction, n: number): Promise<number | null> {
  const counterRef = adminDb.doc(paths.matchIdCounter);
  const count = (await tx.get(counterRef)).data()?.count;
  if (typeof count !== "number") return null;
  tx.set(counterRef, { count: count + n }, { merge: true });
  return count + 1;
}

/**
 * Creates a match doc inside `tx`; the transaction fails if the id exists.
 * Untyped data: scheduled and bracket games store fields MatchDoc doesn't
 * allow (null timestamps and seeds, slot links).
 */
export function createMatch(
  tx: Transaction,
  seasonId: string,
  matchId: number,
  data: DocumentData
): void {
  tx.create(adminDb.doc(paths.match(seasonId, matchId)), data);
}

/** Firestore's error for tx.create on an existing doc (gRPC ALREADY_EXISTS). */
export function isAlreadyExists(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === 6 || code === "already-exists";
}

/** A regular-season game from an uploaded schedule. */
export interface ScheduledMatch {
  timestamp: string;
  homeCollege: string;
  awayCollege: string;
  location: string;
  locationExtra?: string;
}

/**
 * Adds a schedule's games to a season with fresh ids, in one transaction.
 * At most 499 games (one write goes to the counter).
 */
export async function addScheduledMatches(
  seasonId: string,
  sport: string,
  scheduled: ScheduledMatch[]
): Promise<"ok" | "no-counter" | "id-taken"> {
  try {
    return await adminDb.runTransaction(async (tx) => {
      const firstId = await reserveMatchIds(tx, scheduled.length);
      if (firstId === null) return "no-counter";
      scheduled.forEach((match, i) => {
        const id = firstId + i;
        const date = new Date(match.timestamp);
        createMatch(tx, seasonId, id, {
          id,
          away_college: match.awayCollege,
          away_college_participants: [],
          away_college_score: null,
          home_college: match.homeCollege,
          home_college_participants: [],
          home_college_score: null,
          forfeit: null,
          location: match.location,
          location_extra: match.locationExtra || null,
          sport,
          timestamp: isNaN(date.getTime()) ? null : Timestamp.fromDate(date),
          type: "Regular",
          winner: null,
        });
      });
      return "ok";
    });
  } catch (err) {
    if (isAlreadyExists(err)) return "id-taken";
    throw err;
  }
}

/** The match doc, for services that change it in a transaction. */
export function matchRef(
  seasonId: string,
  matchId: string | number
): DocumentReference<MatchDoc> {
  return adminDb.doc(paths.match(seasonId, matchId)) as DocumentReference<MatchDoc>;
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

/** A match plus the doc id and season it was read from. */
export interface SeasonMatch {
  docId: string;
  seasonId: string;
  match: MatchDoc;
}

/**
 * The shape the match-list endpoints have always returned: the doc id,
 * overridden by the stored numeric `id`, and an ISO `timestamp`.
 */
export function seasonMatchJson({ docId, seasonId, match }: SeasonMatch) {
  const fields: Partial<MatchDoc> = match; // a stored `id` wins
  return {
    id: docId,
    seasonId,
    ...fields,
    timestamp: match.timestamp?.toDate?.()?.toISOString() || null,
  };
}

export interface SeasonMatchFilter {
  /** Home or away college abbreviation. */
  college?: string;
  sport?: string;
  /** true: has a winner; false: winner is null; unset: either. */
  scored?: boolean;
  /** Starts at or after. */
  from?: Date;
  /** Starts at or before. */
  to?: Date;
}

/** Which part of the sorted results to read. Cursors are doc ids. */
export type SeasonMatchPage =
  | { kind: "all" }
  | { kind: "offset"; offset: number; limit: number }
  | { kind: "after"; cursorId: string; limit: number }
  | { kind: "before"; cursorId: string; limit: number };

export type SortOrder = "asc" | "desc";

function seasonMatchQuery(
  seasonId: string,
  filter: SeasonMatchFilter,
  order: SortOrder
): Query {
  let query = adminDb
    .collection(paths.matches(seasonId))
    .orderBy("timestamp", order);
  if (filter.college) {
    query = query.where(
      Filter.or(
        Filter.where("home_college", "==", filter.college),
        Filter.where("away_college", "==", filter.college)
      )
    );
  }
  if (filter.sport) query = query.where("sport", "==", filter.sport);
  if (filter.scored === true) query = query.where("winner", "!=", null);
  else if (filter.scored === false) query = query.where("winner", "==", null);
  if (filter.from) query = query.where("timestamp", ">=", filter.from);
  if (filter.to) query = query.where("timestamp", "<=", filter.to);
  return query;
}

/** How many of a season's matches pass `filter`. */
export async function countSeasonMatches(
  seasonId: string,
  filter: SeasonMatchFilter,
  order: SortOrder
): Promise<number> {
  const snap = await seasonMatchQuery(seasonId, filter, order).count().get();
  return snap.data().count;
}

/**
 * One page of a season's matches, sorted by start time. Null if the page's
 * cursor doc doesn't exist.
 */
export async function listSeasonMatches(
  seasonId: string,
  filter: SeasonMatchFilter,
  order: SortOrder,
  page: SeasonMatchPage
): Promise<SeasonMatch[] | null> {
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
  return snap.docs.map((d) => ({ docId: d.id, seasonId, match: d.data() as MatchDoc }));
}

/**
 * Played matches (winner set, started in [from, before)) of every season,
 * sorted by start time. Ties keep the season-listing order, then doc id.
 * One time-bounded query per season; the rest is filtered in memory.
 */
export async function listPlayedMatchesAllSeasons(
  range: { from?: Date; before: Date },
  filter: Pick<SeasonMatchFilter, "college" | "sport">,
  order: SortOrder
): Promise<SeasonMatch[]> {
  const seasons = await adminDb.doc(paths.matchSeasons).listCollections();
  const perSeason = await Promise.all(
    seasons.map(async ({ id: seasonId }) => {
      // A range query on one field returns timestamp asc, then doc id.
      let query: Query = adminDb
        .collection(paths.matches(seasonId))
        .where("timestamp", "<", range.before);
      if (range.from) query = query.where("timestamp", ">=", range.from);
      const snap = await query.get();
      return snap.docs.map((d) => ({ docId: d.id, seasonId, match: d.data() as MatchDoc }));
    })
  );
  const played = perSeason
    .flat()
    .filter(
      ({ match: m }) =>
        m.winner != null &&
        (!filter.college || m.home_college === filter.college || m.away_college === filter.college) &&
        (!filter.sport || m.sport === filter.sport)
    );
  const ms = (m: SeasonMatch) => m.match.timestamp.toMillis();
  // Stable sort: equal start times stay in the order read above.
  return played.sort((a, b) => (order === "asc" ? ms(a) - ms(b) : ms(b) - ms(a)));
}
