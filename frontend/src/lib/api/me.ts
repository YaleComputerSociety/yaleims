// The caller's own things: their name (PATCH /api/me), a new
// directory lookup (POST /api/me/directory) and the games they're signed up
// for (GET /api/me/matches).
import { z } from "zod";
import type { DirectoryOutcome, RosterEntryDoc } from "@/types/firestore";
import { request } from "./core";
import type { Match } from "./matches";

/** PATCH /api/me: a new name, while it's the caller's to set (the session's canEditName). */
export const meChangeSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(60, "That name is too long (60 characters at most).")
    .regex(/^[^\p{C}<>]+$/u, "A name can't contain < > or control characters."),
});
export type MeChange = z.infer<typeof meChangeSchema>;

/** POST /api/me/directory: what the new lookup found (the session shows the result). */
export interface DirectoryRefresh {
  outcome: DirectoryOutcome;
}

/**
 * One of the caller's games, with where their own entry stands: the
 * captain's call, attendance that counts (`present`: false on a cancelled
 * game, C19), and whether that attendance is under review
 * (lib/attendance.ts: it doesn't count until an admin confirms it).
 */
export type MyMatch = Match & { mine: Pick<RosterEntryDoc, "captainStatus" | "present"> & { underReview: boolean } };

export interface MyMatchList {
  items: MyMatch[];
  total: number;
}

/** GET /api/me/matches?seasonId&upcoming: the caller's games that season (not those a captain took them off), by start. */
export const myMatchesQuerySchema = z.strictObject({
  seasonId: z.string().min(1),
  /** Only games that haven't started. */
  upcoming: z.stringbool().default(false),
});
/** The query as a page passes it (request() writes the boolean as "true"/"false"). */
export type MyMatchesQuery = { seasonId: string; upcoming?: boolean };

export const changeMe = (change: MeChange) => request<void>("PATCH", "/api/me", { body: change });

/** Looks the caller up in the Yale directory again (429 within the cooldown: details.retryAt). */
export const refreshDirectory = () => request<DirectoryRefresh>("POST", "/api/me/directory");

export const fetchMyMatches = (query: MyMatchesQuery) => request<MyMatchList>("GET", "/api/me/matches", { query });

