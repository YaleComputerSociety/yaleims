// Firestore documents as they are stored today, one type per collection.
// Types only, no runtime code: the server data layer (src/server/data) and
// browser code both import them. Paths live in src/lib/paths.ts. Old docs
// also hold frozen betting/odds fields; those are not typed. Phase 2 changes
// these types, src/lib/paths.ts and src/server/data.

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

/** A document's data plus its id, in the shape the API has always returned. */
export type WithId<T> = T & { id: string };

// ── Matches: matches/seasons/{seasonId}/{matchId} ──────────────────────────

/** A player on a match roster. Some old entries hold more user fields. */
export interface MatchParticipant {
  email: string;
  name?: string;
  firstname?: string;
  lastname?: string;
}

/** A match doc. Old docs also hold frozen odds/betting fields (`*_odds`, `*_volume`, `predictions`). */
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
  timestamp: StoredTimestamp;
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

// ── Score reports: matches/score_reports/{seasonId}/{matchId}/reports/{id} ─

export interface ScoreReportDoc {
  reason: string;
  reportedBy: string;
  reportedByEmail: string;
  reportedAt: StoredTimestamp;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: StoredTimestamp;
  season: string;
  matchId: string;
  matchHomeCollege: string | null;
  matchAwayCollege: string | null;
  homeScore: number | null;
  awayScore: number | null;
  sport: string | null;
}

// ── Users: users/{email}, users/{email}/seasons/{seasonId} ──────────────────

/** users/{email}. Old docs also hold frozen betting fields. */
export interface UserDoc {
  email?: string;
  firstname?: string;
  lastname?: string;
  college?: string | null;
  username?: string;
  mRoles?: string[];
  sportsCaptainOf?: string[];
  /** Legacy single role; roles live in mRoles. */
  role?: string;
  matches_played?: number;
}

/** A game a user signed up for, as stored on the user-season doc. */
export interface UserSeasonMatch {
  id: number | string;
  timestamp: string;
}

/** users/{email}/seasons/{seasonId}. Some old docs hold `matches` as a non-array. */
export interface UserSeasonDoc {
  matches?: UserSeasonMatch[];
}

// ── Seasons: seasons/current, seasons/past ─────────────────────────────────

/** seasons/current. */
export interface CurrentSeasonDoc {
  /** The season id, e.g. "2026-2027". */
  year: string;
  /** "fall" | "winter" | "spring". */
  season: string;
  winningCollegeId?: string | null;
  celebrationActive?: boolean;
  championshipUpdatedAt?: StoredTimestamp;
}

// ── College standings: colleges/seasons/{seasonId}/{abbr} ──────────────────

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
  migratedAt?: StoredTimestamp;
}

// ── Brackets and tournaments ───────────────────────────────────────────────

/** One slot of a bracket (also the shape of a tournament's slots). */
export interface BracketEntry {
  bracket_placement: number;
  round: string;
  match_id: number;
  timestamp: StoredTimestamp;
}

/** brackets/seasons/{seasonId}/{sport}, one per sport; the games are match docs. */
export interface BracketDoc {
  sport: string;
  createdAt?: StoredTimestamp;
  matches?: BracketEntry[];
}

/** Colleges awarded each placement bonus (null once reversed). */
export interface TournamentPlacements {
  first?: string | null;
  second?: string | null;
  third?: string | null;
}

/** tournaments/seasons/{seasonId}/{tournamentId}. */
export interface TournamentDoc {
  name: string;
  sport: string;
  season: string;
  createdAt?: StoredTimestamp;
  /** Its 16 slots, shaped like a bracket's; the games are match docs. */
  matches?: BracketEntry[];
  /** Bonus points per placement; missing or invalid values use the defaults. */
  placement_points?: unknown;
  placements?: TournamentPlacements;
  [field: string]: unknown;
}

// ── MVPs: mvps/{seasonId}/{college}/{weekId} ───────────────────────────────

/** One week's MVPs of a college, keyed by email. */
export type MvpWeekDoc = Record<string, { fname?: string; lname?: string }>;
