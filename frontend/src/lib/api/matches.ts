// The matches API: a season's games (/api/seasons/{seasonId}/matches, whole
// or in cursor pages), one game's details and result.
import { z } from "zod";
import type { MatchDoc, WithId } from "@/types/firestore";
import { collegeIdSchema } from "./colleges";
import { request, toJson, url, type Json } from "./core";

/** A game as the API sends it: the stored doc without who scored it (a user id, §3.1 of the plan). */
export type Match = Json<WithId<Omit<MatchDoc, "scoredBy">>>;

export function toMatch({ scoredBy: _scoredBy, ...match }: WithId<MatchDoc>): Match {
  return toJson(match);
}

/** The whole filtered list (the Day view's season). */
export interface MatchList {
  items: Match[];
  total: number;
}

/** One page in cursor mode; `next` goes back as `after` for the page after it (null at the end). */
export interface MatchPage {
  items: Match[];
  next: string | null;
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
/** Up to 30 ids (what one Firestore `in` or `array-contains-any` takes), comma-separated in the URL. */
const idList = <Item extends z.ZodType<string, string>>(item: Item) =>
  z.string().transform((text) => text.split(",")).pipe(z.array(item).min(1).max(30));

/** A place in a season's list: a game's start (ms since the epoch) and id, sent as `<ms>|<id>`. */
export interface MatchCursor {
  startsAtMs: number;
  id: string;
}
export const encodeCursor = ({ startsAtMs, id }: MatchCursor): string => `${startsAtMs}|${id}`;
const cursor = z.string().regex(/^\d{1,15}\|[^/|]{1,128}$/, "Not a cursor").transform((text): MatchCursor => {
  const bar = text.indexOf("|");
  return { startsAtMs: Number(text.slice(0, bar)), id: text.slice(bar + 1) };
});

/**
 * GET /api/seasons/{seasonId}/matches, by start. With `limit`, one cursor
 * page: that many games after `after` (the previous answer's `next`),
 * answered as a `MatchPage`; without it, every game that passes the filters
 * (a `MatchList`). In cursor mode `collegeIds` or `sportIds` list the games
 * of any of those colleges or sports together (the favorites tab), instead
 * of the single `collegeId` / `sportId`.
 */
export const seasonMatchesQuerySchema = z.strictObject({
  ...filters,
  status: z.enum(["scheduled", "final", "cancelled"]).optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  limit: z.coerce.number<number>().int().min(1).max(100).optional(),
  after: cursor.optional(),
  collegeIds: idList(collegeIdSchema).optional(),
  sportIds: idList(z.string().min(1)).optional(),
})
  .refine((q) => q.limit !== undefined || (q.after ?? q.collegeIds ?? q.sportIds) === undefined, { message: "after, collegeIds and sportIds need limit", path: ["limit"] })
  .refine((q) => q.collegeId === undefined || q.collegeIds === undefined, { message: "Use collegeId or collegeIds, not both", path: ["collegeIds"] })
  .refine((q) => q.sportId === undefined || q.sportIds === undefined, { message: "Use sportId or sportIds, not both", path: ["sportIds"] });
export type SeasonMatchesQuery = z.input<typeof seasonMatchesQuerySchema>;

/** The cursor mode's query, with its id lists as arrays. */
export type MatchPageQuery = Omit<SeasonMatchesQuery, "collegeIds" | "sportIds"> & {
  limit: number;
  collegeIds?: string[];
  sportIds?: string[];
};

export const fetchSeasonMatches = (seasonId: string, query: SeasonMatchesQuery = {}) =>
  request<MatchList>("GET", url`/api/seasons/${seasonId}/matches`, { query });

/** The same route in cursor mode: one page of `limit` games after `after`. */
export const fetchMatchPage = (seasonId: string, { collegeIds, sportIds, ...query }: MatchPageQuery) =>
  request<MatchPage>("GET", url`/api/seasons/${seasonId}/matches`, {
    query: { ...query, collegeIds: collegeIds?.join(","), sportIds: sportIds?.join(",") },
  });

/** GET /api/seasons/{seasonId}/matches/{matchId} (public). */
export const fetchMatch = (seasonId: string, matchId: string) =>
  request<Match>("GET", url`/api/seasons/${seasonId}/matches/${matchId}`);

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
