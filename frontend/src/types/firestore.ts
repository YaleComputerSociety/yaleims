// Firestore documents of schema v3 (REDESIGN.md section 4), one type per
// collection. Types only, no runtime code: the server data layer
// (src/server/data), the API contract (src/lib/api) and the browser
// listeners import them. Paths live in src/lib/paths.ts. The schema before v3
// is described in git tag v3-migration (src/types/legacy.ts).
//
// Everything that belongs to a season lives under seasons/{seasonId} (D29);
// global are only users, usernames and config/app. References are ids:
// collegeId = the college's abbreviation ("MY"), sportId = the sports doc id,
// userId / playerId = an email (a guest player has "guest-<random>"). A field
// whose value is unknown or doesn't apply is stored as null, not left out.

/**
 * A stored timestamp. Structural, so the Admin SDK's and the browser SDK's
 * Timestamp classes both fit.
 */
export interface StoredTimestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

/** A document's data plus its id. */
export type WithId<T> = T & { id: string };

/** A calendar day in Eastern time, "yyyy-mm-dd" (the league's day, D34). */
export type EasternDate = string;

// ── Global: config/app, users/{email}, usernames/{username} ────────────────

/** config/app: the current season and feature switches. */
export interface AppConfigDoc {
  currentSeasonId: string;
  features: {
    /** U11 "My stats" in the Hub, hidden until attendance is tracked (D33). */
    myStats: boolean;
  };
}

/** Roles that hold across seasons. Season roles are on the player (SeasonRole). */
export type GlobalRole = "admin" | "dev";

/**
 * users/{email}: identity across seasons. Old docs also hold frozen fields
 * (mRoles, college, role, sportsCaptainOf, betting totals), not read or written.
 */
export interface UserDoc {
  email: string;
  firstname: string;
  lastname: string;
  username: string;
  roles: GlobalRole[];
  /** The user's first own login; null = created for them by a captain/supervisor (U10). */
  claimedAt: StoredTimestamp | null;
  /** Who created the account for them (U10); null = they did, by logging in. */
  createdBy: string | null;
}

/** usernames/{username}: who holds the username. */
export interface UsernameDoc {
  userId: string;
}

// ── seasons/{seasonId} ─────────────────────────────────────────────────────

export type Term = "fall" | "winter" | "spring";

/** seasons/{seasonId}, e.g. "2026-2027". */
export interface SeasonDoc {
  /** As shown, e.g. "2026-2027". */
  label: string;
  startYear: number;
  currentTerm: Term;
  championCollegeId: string | null;
  celebrationActive: boolean;
  championshipUpdatedAt: StoredTimestamp | null;
}

/** seasons/{s}/sports/{sportId}: the season's lineup (ids = the old sports doc ids). */
export interface SportDoc {
  name: string;
  emoji: string;
  term: Term;
  pointsForWin: number;
  active: boolean;
}

/** The fields a standing counts (a result changes them; scoring is the only writer). */
export interface StandingStats {
  points: number;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  forfeits: number;
}

/** seasons/{s}/colleges/{collegeId}: a college and its standing this season. */
export interface CollegeDoc extends StandingStats {
  name: string;
  abbreviation: string;
  rank: number;
  /** The rank before the day's first re-rank (the leaderboard's rank change). */
  prevRank: number;
  /** The day of the last rank snapshot. */
  rankDate: EasternDate;
}

/**
 * seasons/{s}/colleges/{c}/teams/{sportId}: a college's team in a sport.
 * Created on first use (a captain or a scored game).
 */
export interface TeamDoc {
  seasonId: string;
  collegeId: string;
  sportId: string;
  captainIds: string[];
  games: number;
  wins: number;
  losses: number;
  ties: number;
  forfeits: number;
  pointsFor: number;
  pointsAgainst: number;
}

/** seasons/{s}/colleges/{c}/adjustments/{id}: a manual point change (P7, feature later). */
export interface AdjustmentDoc {
  points: number;
  reason: string;
  by: string;
  at: StoredTimestamp;
}

/** seasons/{s}/colleges/{c}/mvps/{awardId}: one weekly MVP. */
export interface MvpDoc {
  seasonId: string;
  collegeId: string;
  /** The season week, 1-based. */
  week: number;
  playerId: string;
  name: string;
  /** null for migrated awards (not recorded before). */
  awardedBy: string | null;
  awardedAt: StoredTimestamp | null;
}

export type SeasonRole = "supervisor" | "college_rep";
export type JoinedVia = "login" | "captain" | "supervisor" | "migration";

/**
 * seasons/{s}/players/{playerId}: a person's membership in the season (D30),
 * created on their first login of the season or when a captain/supervisor
 * adds them. playerId = their email, or "guest-<random>".
 */
export interface PlayerDoc {
  seasonId: string;
  /** Fixed for the season (from Yalies when created); null if Yalies has none. */
  collegeId: string | null;
  name: string;
  /** null for a guest. */
  userId: string | null;
  roles: SeasonRole[];
  joinedAt: StoredTimestamp;
  joinedVia: JoinedVia;
}

// ── Matches ────────────────────────────────────────────────────────────────

export type Stage = "regular" | "playoff";
export type Division = "blue" | "green" | "final";
export type MatchStatus = "scheduled" | "final" | "cancelled";
export type Outcome = "home" | "away" | "draw" | "double_forfeit";

export interface MatchResult {
  /** null only for old results recorded without a score. */
  homeScore: number | null;
  awayScore: number | null;
  outcome: Outcome;
  /** The losing side forfeited (a double forfeit has outcome double_forfeit). */
  forfeit: boolean;
}

/**
 * seasons/{s}/matches/{matchId}: one game. Migrated games keep their number
 * as the doc id; new ones get auto ids (D28). Byes are bracket slots, not
 * games. The bracket fields are null on regular games.
 */
export interface MatchDoc {
  seasonId: string;
  sportId: string;
  /** null while a bracket slot waits for a winner ("TBD"). */
  homeCollegeId: string | null;
  awayCollegeId: string | null;
  /** (derived) the known college ids, for "games of college X". */
  collegeIds: string[];
  startsAt: StoredTimestamp;
  venue: string | null;
  venueDetail: string | null;
  division: Division | null;
  stage: Stage;
  bracketId: string | null;
  bracketSlot: number | null;
  /** "Playoff", "Quarterfinal", "Semifinal", "Final", "Third Place". */
  round: string | null;
  homeSeed: number | null;
  awaySeed: number | null;
  /** The game the winner moves to. */
  nextMatchId: string | null;
  /** The game the loser moves to (a tournament's third place game). */
  nextLoserMatchId: string | null;
  /** The sport's points for a win when the game was created. */
  pointsForWin: number;
  status: MatchStatus;
  result: MatchResult | null;
  /** null for results recorded before v3. */
  scoredBy: string | null;
  scoredAt: StoredTimestamp | null;
  updatedAt: StoredTimestamp;
}

export type AddedBy = "self" | "captain" | "supervisor" | "legacy";
export type CaptainStatus = "confirmed" | "removed";

/** seasons/{s}/matches/{m}/roster/{playerId}: one player on one game (D34). */
export interface RosterEntryDoc {
  seasonId: string;
  matchId: string;
  sportId: string;
  collegeId: string;
  playerId: string;
  name: string;
  /** (derived) the match's start; a reschedule updates it in the same transaction. */
  startsAt: StoredTimestamp;
  addedBy: AddedBy;
  /** Who added the entry (the player for "self"); null for legacy entries. */
  addedByUser: string | null;
  signedUpAt: StoredTimestamp | null;
  captainStatus: CaptainStatus | null;
  captainBy: string | null;
  captainAt: StoredTimestamp | null;
  /** true = marked present; false = not marked; null = never recorded (legacy). */
  present: boolean | null;
  presentBy: string | null;
  presentAt: StoredTimestamp | null;
}

export type ScoreReportStatus = "open" | "resolved";

/** seasons/{s}/matches/{m}/scoreReports/{reportId}: a user flags a wrong score. */
export interface ScoreReportDoc {
  seasonId: string;
  matchId: string;
  reason: string;
  /** The reporter's email. */
  reportedBy: string;
  reporterName: string;
  reportedAt: StoredTimestamp;
  /** The score the reporter saw (null if the game had none). */
  scoreAtReport: { home: number | null; away: number | null };
  status: ScoreReportStatus;
  resolvedBy: string | null;
  resolvedAt: StoredTimestamp | null;
}

// ── Brackets: playoffs and tournaments ─────────────────────────────────────

export type BracketKind = "playoffs" | "tournament";

/** One slot of a bracket: a game, or a bye (the college moves on without one). */
export interface BracketSlot {
  slot: number;
  round: string;
  matchId: string | null;
  byeCollegeId: string | null;
  /** The bye college's seed (display only, D31). */
  byeSeed: number | null;
  /** The time shown on a bye (the upload's time for it); null for a game. */
  byeStartsAt: StoredTimestamp | null;
}

/** Bonus points per tournament placement. */
export interface PlacementPoints {
  first: number;
  second: number;
  third: number;
}

/** Colleges awarded each placement bonus (null = not awarded, or taken back). */
export interface Placements {
  first: string | null;
  second: string | null;
  third: string | null;
}

/** seasons/{s}/brackets/{bracketId}: a sport's playoffs or a tournament. */
export interface BracketDoc {
  seasonId: string;
  sportId: string;
  kind: BracketKind;
  name: string;
  /** The day of a one-day event (all its games on that day), else null. */
  date: EasternDate | null;
  slots: BracketSlot[];
  /** Tournaments: the third place game's slot. */
  thirdPlaceSlot: number | null;
  placementPoints: PlacementPoints | null;
  placements: Placements | null;
  createdAt: StoredTimestamp;
}

// ── seasons/{s}/auditLog/{entryId} ─────────────────────────────────────────

/**
 * One supervisor/admin action (D32), written in the same transaction as the
 * change. `before` holds each target doc as it was (null = it didn't exist).
 */
export interface AuditLogDoc {
  at: StoredTimestamp;
  actor: { userId: string; roles: string[] };
  action: string;
  params: Record<string, unknown>;
  targets: string[];
  before: Record<string, Record<string, unknown> | null>;
}
