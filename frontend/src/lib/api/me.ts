// The caller's own things: their username (PATCH /api/me) and the games
// they're signed up for (GET /api/me/matches).
import { z } from "zod";
import { request } from "./core";
import type { MatchList } from "./matches";

/** PATCH /api/me: a new username (3–20 letters, digits or underscores; unique). */
export const meChangeSchema = z.strictObject({
  username: z
    .string()
    .trim()
    .min(3, "Username must be between 3 and 20 characters long")
    .max(20, "Username must be between 3 and 20 characters long")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores, and no spaces"),
});
export type MeChange = z.infer<typeof meChangeSchema>;

/** GET /api/me/matches?seasonId&upcoming: the caller's games that season (not those a captain took them off), by start. */
export const myMatchesQuerySchema = z.strictObject({
  seasonId: z.string().min(1),
  /** Only games that haven't started. */
  upcoming: z.stringbool().default(false),
});
/** The query as a page passes it (request() writes the boolean as "true"/"false"). */
export type MyMatchesQuery = { seasonId: string; upcoming?: boolean };

export const changeMe = (change: MeChange) => request<void>("PATCH", "/api/me", { body: change });

export const fetchMyMatches = (query: MyMatchesQuery) => request<MatchList>("GET", "/api/me/matches", { query });

