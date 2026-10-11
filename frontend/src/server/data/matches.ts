// Matches: matches/seasons/{seasonId}/{matchId}.
import "server-only";
import {
  Filter,
  Timestamp,
  type DocumentReference,
  type Query,
} from "firebase-admin/firestore";
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

/** A regular-season game from an uploaded schedule. */
export interface ScheduledMatch {
  timestamp: string;
  homeCollege: string;
  awayCollege: string;
  location: string;
  locationExtra?: string;
}

/**
 * Adds a schedule's games to a season with fresh ids from counters/matches,
 * in one transaction. Returns false if the counter is missing or malformed.
 * At most 499 games (one write goes to the counter).
 */
export async function addScheduledMatches(
  seasonId: string,
  sport: string,
  scheduled: ScheduledMatch[]
): Promise<boolean> {
  const counterRef = adminDb.doc(paths.matchIdCounter);
  return adminDb.runTransaction(async (tx) => {
    const count = (await tx.get(counterRef)).data()?.count;
    if (typeof count !== "number") return false;

    // count is the last id handed out, so the next free id is one past it.
    let nextId = count + 1;
    for (const match of scheduled) {
      const date = new Date(match.timestamp);
      tx.set(adminDb.doc(paths.match(seasonId, nextId)), {
        id: nextId,
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
      nextId++;
    }
    tx.set(counterRef, { count: nextId - 1 }, { merge: true });
    return true;
  });
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
