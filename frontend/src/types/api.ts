// Response bodies of the API routes (src/app/api), built from the stored
// document types. The routes check what they send against these
// (`satisfies`), and pages type what they read with them. Types only.
// Only the bodies pages read are typed here; errors are { error } or
// { message } or plain text, depending on the route.
import type {
  BracketEntry,
  CollegeStandingDoc,
  CurrentSeasonDoc,
  MatchDoc,
  MatchParticipant,
  MvpWeekDoc,
  StoredTimestamp,
  TournamentDoc,
  UserDoc,
  UserSeasonMatch,
  WithId,
} from "./firestore";

/** How Response.json writes an Admin SDK Timestamp. */
export interface SerializedTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

/** A stored document as Response.json sends it: timestamps become SerializedTimestamp. */
export type Serialized<T> = T extends StoredTimestamp
  ? SerializedTimestamp
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

/**
 * What a route passes to Response.json to send a T: a SerializedTimestamp may
 * still be a stored Timestamp (Response.json serializes it). Routes check
 * bodies holding stored docs with `satisfies RouteBody<...>`.
 */
export type RouteBody<T> = T extends SerializedTimestamp
  ? SerializedTimestamp | StoredTimestamp
  : T extends (infer U)[]
    ? RouteBody<U>[]
    : T extends object
      ? { [K in keyof T]: RouteBody<T[K]> }
      : T;

// ── Session ────────────────────────────────────────────────────────────────

/** The session token's payload; /api/auth/verify returns it as `user`. */
export interface SessionUser {
  name: string;
  netid: string;
  email: string;
  role: string;
  mRoles: string[];
  username: string;
  college: string;
  matches_played: number;
}

/** GET /api/auth/verify */
export type VerifyResponse =
  | { isLoggedIn: true; user: SessionUser }
  | { isLoggedIn: false };

// ── Seasons and standings ──────────────────────────────────────────────────

/** GET getSeasons */
export interface SeasonsResponse {
  current: Serialized<CurrentSeasonDoc>;
  past: { years: string[] };
}

/** One college in GET getLeaderboard (best first). */
export type LeaderboardEntry = Serialized<WithId<CollegeStandingDoc>>;

// ── Matches ────────────────────────────────────────────────────────────────

/** A match with its timestamp as an ISO string. */
export type MatchWithIsoTime = Omit<MatchDoc, "timestamp"> & { timestamp: string };

/**
 * A match in getMatches / getMatchesv2: the doc plus the season it was read
 * from. `id` is the stored numeric id (the doc id for a doc without one).
 */
export type MatchJson = Omit<MatchDoc, "id" | "timestamp"> & {
  id: number | string;
  seasonId: string;
  timestamp: string | null;
};

/** GET getMatches: one page; the cursors are the first and last match's id. */
export interface MatchPageResponse {
  matches: MatchJson[];
  firstVisible: MatchJson["id"] | null;
  lastVisible: MatchJson["id"] | null;
  totalPages: number;
}

/** GET getMatchesv2 */
export interface MatchPageV2Response extends MatchPageResponse {
  totalResults: number;
}

/** A match in GET getUnscoredMatches: the stored doc, timestamp as Response.json writes it. */
export type UnscoredMatch = Serialized<MatchDoc>;

/** GET getUnscoredMatches: started, unscored matches, oldest first. */
export interface UnscoredMatchesResponse {
  success: true;
  matches: UnscoredMatch[];
}

/** One match in GET getCollegeMatches (a college's next games). */
export type CollegeMatchJson = Pick<
  MatchDoc,
  | "id"
  | "home_college"
  | "away_college"
  | "sport"
  | "home_college_score"
  | "away_college_score"
  | "home_college_participants"
  | "away_college_participants"
  | "location"
  | "location_extra"
  | "winner"
  | "type"
> & { timestamp: string };

/** GET getUserMatchObjects: the user's upcoming games (null for a game whose doc is gone). */
export type UserMatchObjectsResponse = (MatchWithIsoTime | null)[];

/** GET getUserMatches: the games the user signed up for that haven't started. */
export type UserSignupsResponse = UserSeasonMatch[];

/** GET getMatchParticipants (empty rosters for an unknown match). */
export interface MatchParticipantsResponse {
  home_college_participants: MatchParticipant[];
  away_college_participants: MatchParticipant[];
}

/** A score report from GET getScoreReports. */
export interface ScoreReport {
  id: string;
  reason: string;
  reportedBy: string;
  reportedByEmail: string;
  /** "" if the stored report has no time. */
  reportedAt: SerializedTimestamp | "";
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: SerializedTimestamp;
  matchId: string;
  season: string;
  matchHomeCollege?: string | null;
  matchAwayCollege?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  sport?: string | null;
}

/** GET getScoreReports: a match's reports, or a season's (admin), newest first. */
export interface ScoreReportsResponse {
  reports: ScoreReport[];
}

// ── Brackets and tournaments ───────────────────────────────────────────────

/** A tournament slot from GET getTournaments, timestamp in epoch ms. */
export type TournamentSlotJson = Omit<BracketEntry, "timestamp"> & {
  timestamp: number | null;
};

/** A tournament from GET getTournaments; `id` is the doc id, createdAt in epoch ms. */
export type TournamentJson = Omit<TournamentDoc, "id" | "createdAt" | "matches"> & {
  id: string;
  createdAt: number | null;
  matches: TournamentSlotJson[];
};

/** GET getTournaments: the season's tournaments, newest first. */
export interface TournamentsResponse {
  year: string;
  tournaments: TournamentJson[];
}

// ── Users ──────────────────────────────────────────────────────────────────

/** A captain as listed by GET getUsersInCollege?wantCaptains=true. */
export interface CollegeCaptain {
  firstName?: string;
  lastName?: string;
  email?: string;
  sportsCaptainOf?: string[];
}

/** GET getUsersInCollege: the college rep's college. */
export interface UsersInCollegeResponse {
  users: UserDoc[];
  /** Only with ?wantCaptains=true. */
  captains?: CollegeCaptain[];
}

/** GET getSpecialUsers: a college's captains and reps, or every admin / dev. */
export interface SpecialUsersResponse {
  users: WithId<UserDoc>[];
}

/** GET getMVPs: a college's MVPs for a season, keyed by week id ("week_4"). */
export type MvpsResponse = Record<string, MvpWeekDoc>;

/** GET getUserStats: the games the user signed up for this season. */
export interface UserStatsResponse {
  matches: UserSeasonMatch[];
}

/**
 * GET getCaptainSports: the sports the user captains, or (status 200) an
 * error object for a user who isn't a captain.
 */
export type CaptainSportsResponse =
  | string[]
  | { error: string; sportsCaptainOf: [] };
