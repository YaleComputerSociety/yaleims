// The roster API: who is on a game (/api/seasons/{s}/matches/{m}/roster),
// the caller's own sign-up (…/roster/me), and the sheet captains and
// supervisors work on (…/roster/sheet, …/roster/{playerId}, …/roster/guests).
// The rules follow D34 (services/signups.ts, services/roster.ts).
import { z } from "zod";
import type { RosterEntryDoc } from "@/types/firestore";
import { collegeIdSchema } from "./colleges";
import { request, toJson, url, type Json } from "./core";

/** The caller's own entry, whole. */
export type RosterEntry = Json<RosterEntryDoc>;

/** An entry as everyone signed in sees it: names, college and status, no emails (§3.1 of the plan). */
export type PublicRosterEntry = Json<Omit<RosterEntryDoc, "playerId" | "addedByUser" | "captainBy" | "presentBy">>;

export function toPublicEntry({
  playerId: _playerId,
  addedByUser: _addedByUser,
  captainBy: _captainBy,
  presentBy: _presentBy,
  ...entry
}: RosterEntryDoc): PublicRosterEntry {
  return toJson(entry);
}

/**
 * GET …/roster (signed in): the game's players in sign-up order (not those
 * a captain took off), and the caller's own entry (a removed one too, so the
 * page can say why they can't sign up).
 */
export interface Roster {
  items: PublicRosterEntry[];
  total: number;
  mine: RosterEntry | null;
}

export const fetchRoster = (seasonId: string, matchId: string) =>
  request<Roster>("GET", url`/api/seasons/${seasonId}/matches/${matchId}/roster`);

/** PUT …/roster/me: signs the caller up, on their college's side (already on it: fine). */
export const signUp = (seasonId: string, matchId: string) =>
  request<void>("PUT", url`/api/seasons/${seasonId}/matches/${matchId}/roster/me`);

/** DELETE …/roster/me: takes the caller off (not on it: fine). */
export const withdraw = (seasonId: string, matchId: string) =>
  request<void>("DELETE", url`/api/seasons/${seasonId}/matches/${matchId}/roster/me`);

// ── The sheet (captains and supervisors) ───────────────────────────────────

/**
 * GET …/roster/sheet: every entry (taken-off ones too, with ids) on the sides
 * the caller manages: both for a supervisor, their college's for a captain.
 */
export interface RosterSheet {
  /** The sides (college ids) the caller manages. */
  collegeIds: string[];
  /** A supervisor: takes attendance, any time; otherwise a captain, until the start. */
  supervisor: boolean;
  /** Each entry with the player's NetID (null: none recorded, or a guest), to tell same-named players apart. */
  items: (RosterEntry & { netid: string | null })[];
  total: number;
}

/** PATCH …/roster/{playerId}: the captain's call (null takes it back) and/or attendance (supervisors). */
export const rosterChangeSchema = z
  .strictObject({
    captainStatus: z.enum(["confirmed", "removed"]).nullable().optional(),
    present: z.boolean().optional(),
  })
  .refine((c) => c.captainStatus !== undefined || c.present !== undefined, "Send captainStatus or present.");
export type RosterChange = z.infer<typeof rosterChangeSchema>;

/** POST …/roster/guests: someone without an account, present at the game (supervisors). */
export const guestSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  collegeId: collegeIdSchema,
});
export type Guest = z.infer<typeof guestSchema>;

export const fetchRosterSheet = (seasonId: string, matchId: string) =>
  request<RosterSheet>("GET", url`/api/seasons/${seasonId}/matches/${matchId}/roster/sheet`);

export const changeRosterEntry = (seasonId: string, matchId: string, playerId: string, change: RosterChange) =>
  request<void>("PATCH", url`/api/seasons/${seasonId}/matches/${matchId}/roster/${playerId}`, { body: change });

/** PUT …/roster/{playerId}: puts a season player of either side on the game (a captain: confirmed; a supervisor: present). */
export const addRosterPlayer = (seasonId: string, matchId: string, playerId: string) =>
  request<void>("PUT", url`/api/seasons/${seasonId}/matches/${matchId}/roster/${playerId}`);

export const addGuest = (seasonId: string, matchId: string, guest: Guest) =>
  request<{ playerId: string }>("POST", url`/api/seasons/${seasonId}/matches/${matchId}/roster/guests`, { body: guest });
