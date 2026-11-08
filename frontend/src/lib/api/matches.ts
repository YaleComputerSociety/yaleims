// The matches API: a season's games (/api/seasons/{seasonId}/matches), one
// game's details and result, and one season's played games (/api/matches).
import { z } from "zod";
import type { MatchDoc, WithId } from "@/types/firestore";
import { collegeIdSchema } from "./colleges";
import { request, toJson, url, type Json } from "./core";

/** A game as the API sends it: the stored doc without who scored it (a user id, §3.1 of the plan). */
export type Match = Json<WithId<Omit<MatchDoc, "scoredBy">>>;

export function toMatch({ scoredBy: _scoredBy, ...match }: WithId<MatchDoc>): Match {
  return toJson(match);
}

export interface MatchList {
  items: Match[];
  total: number;
}

// ── Lists ──────────────────────────────────────────────────────────────────

const time = z.iso.datetime({ offset: true });
const filters = {
  /** Home or away. */
  collegeId: collegeIdSchema.optional(),
  sportId: z.string().min(1).optional(),
  /** Starts at or after (ISO time; a day starts at Eastern midnight, lib/dates.ts). */
  from: time.optional(),
  /** Starts at or before. */
  to: time.optional(),
};
const page = z.coerce.number<number>().int().min(1);
const pageSize = z.coerce.number<number>().int().min(1).max(100).default(20);

/**
 * GET /api/seasons/{seasonId}/matches (public), by start. Without `page`,
 * every game that passes the filters (the games page reads the whole season).
 */
export const seasonMatchesQuerySchema = z.strictObject({
  ...filters,
  status: z.enum(["scheduled", "final", "cancelled"]).optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: page.optional(),
  pageSize,
});
export type SeasonMatchesQuery = z.input<typeof seasonMatchesQuerySchema>;

/** GET /api/matches (signed in): played games in the selected or current season. */
export const playedMatchesQuerySchema = z.strictObject({
  ...filters,
  seasonId: z.string().regex(/^\d{4}-\d{4}$/, "Choose a season in YYYY-YYYY format").optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: page.default(1),
  pageSize,
});
export type PlayedMatchesQuery = z.input<typeof playedMatchesQuerySchema>;

export const fetchSeasonMatches = (seasonId: string, query: SeasonMatchesQuery = {}) =>
  request<MatchList>("GET", url`/api/seasons/${seasonId}/matches`, { query });

/** GET /api/seasons/{seasonId}/matches/{matchId} (public). */
export const fetchMatch = (seasonId: string, matchId: string) =>
  request<Match>("GET", url`/api/seasons/${seasonId}/matches/${matchId}`);

export const fetchPlayedMatches = (query: PlayedMatchesQuery = {}) =>
  request<MatchList>("GET", "/api/matches", { query });

// ── Writes (admins) ────────────────────────────────────────────────────────

const venue = z.string().trim().max(200).nullable();

/** A new regular-season game. */
export const newMatchSchema = z.strictObject({
  startsAt: time,
  homeCollegeId: collegeIdSchema,
  awayCollegeId: collegeIdSchema,
  venue,
  venueDetail: venue,
});
export type NewMatch = z.infer<typeof newMatchSchema>;

/** POST /api/seasons/{seasonId}/matches: a sport's schedule, all games or none. */
export const scheduleUploadSchema = z.strictObject({
  sportId: z.string().min(1),
  matches: z.array(newMatchSchema).min(1).max(499),
});
export type ScheduleUpload = z.infer<typeof scheduleUploadSchema>;

/** POST answers 201 with the new games' ids. */
export interface ScheduleUploadResult {
  matchIds: string[];
}

/**
 * PATCH /api/seasons/{seasonId}/matches/{matchId}: teams, time, venue or status.
 * Sport is fixed at creation. Replacing a college clears its entire roster;
 * an incoming college starts blank. A home/away swap retains both rosters.
 */
export const matchEditSchema = z.strictObject({
  homeCollegeId: collegeIdSchema.optional(),
  awayCollegeId: collegeIdSchema.optional(),
  venue: venue.optional(),
  venueDetail: venue.optional(),
  startsAt: time.optional(),
  /** Cancel the game, or restore a cancelled one. */
  status: z.enum(["scheduled", "cancelled"]).optional(),
});
export type MatchEdit = z.infer<typeof matchEditSchema>;

/**
 * PUT /api/seasons/{seasonId}/matches/{matchId}/result. A forfeiting side
 * loses (both: a double forfeit). The college ids are needed only for a side
 * the game doesn't have yet (a bracket game waiting for a winner).
 */
export const matchResultSchema = z.strictObject({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  homeForfeit: z.boolean(),
  awayForfeit: z.boolean(),
  homeCollegeId: collegeIdSchema.optional(),
  awayCollegeId: collegeIdSchema.optional(),
});
export type MatchResultInput = z.infer<typeof matchResultSchema>;

/**
 * PATCH …/result: corrects a scored game's result in one step. A bracket
 * game must keep its winner (409 otherwise: undo it, later rounds first).
 */
export const matchCorrectionSchema = matchResultSchema.omit({ homeCollegeId: true, awayCollegeId: true });
export type MatchCorrection = z.infer<typeof matchCorrectionSchema>;

export const uploadSchedule = (seasonId: string, upload: ScheduleUpload) =>
  request<ScheduleUploadResult>("POST", url`/api/seasons/${seasonId}/matches`, { body: upload });

export const editMatch = (seasonId: string, matchId: string, edit: MatchEdit) =>
  request<void>("PATCH", url`/api/seasons/${seasonId}/matches/${matchId}`, { body: edit });

/** DELETE /api/seasons/{seasonId}/matches/{matchId}: an unscored game outside a bracket, with its roster. */
export const deleteMatch = (seasonId: string, matchId: string) =>
  request<void>("DELETE", url`/api/seasons/${seasonId}/matches/${matchId}`);

export const scoreMatch = (seasonId: string, matchId: string, result: MatchResultInput) =>
  request<void>("PUT", url`/api/seasons/${seasonId}/matches/${matchId}/result`, { body: result });

export const correctScore = (seasonId: string, matchId: string, correction: MatchCorrection) =>
  request<void>("PATCH", url`/api/seasons/${seasonId}/matches/${matchId}/result`, { body: correction });

export const undoScore = (seasonId: string, matchId: string) =>
  request<void>("DELETE", url`/api/seasons/${seasonId}/matches/${matchId}/result`);
