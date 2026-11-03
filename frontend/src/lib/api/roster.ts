// The roster API: who is on a game (/api/seasons/{s}/matches/{m}/roster),
// the caller's own sign-up (…/roster/me), and the sheet captains and
// supervisors work on (…/roster/sheet, …/roster/{playerId}, …/roster/netid).
// The rules follow D34 (services/signups.ts, services/roster.ts).
import { z } from "zod";
import type { RosterEntryDoc } from "@/types/firestore";
import { collegeIdSchema } from "./colleges";
import { NETID_PATTERN } from "../netid";
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
  /** Each entry with the player's NetID, to tell same-named players apart (null: none recorded yet, or a placeholder "netid-<netid>", whose id holds it). */
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

/** POST …/roster/netid: someone by NetID, on a side the caller manages (U10). `name` only labels an unverified NetID. */
export const netidAddSchema = z.strictObject({
  netid: z.string().trim().toLowerCase().regex(NETID_PATTERN, "That doesn't look like a NetID."),
  collegeId: collegeIdSchema,
  name: z.string().trim().max(80).nullable().default(null),
});
export type NetidAdd = z.input<typeof netidAddSchema>;

/** POST …/roster/netid answers 201: who went on the roster; verified = Yalies (or their account) confirmed them. */
export interface NetidAddResult {
  playerId: string;
  verified: boolean;
}

export const fetchRosterSheet = (seasonId: string, matchId: string) =>
  request<RosterSheet>("GET", url`/api/seasons/${seasonId}/matches/${matchId}/roster/sheet`);

export const changeRosterEntry = (seasonId: string, matchId: string, playerId: string, change: RosterChange) =>
  request<void>("PATCH", url`/api/seasons/${seasonId}/matches/${matchId}/roster/${playerId}`, { body: change });

/** PUT …/roster/{playerId}: puts a season player of either side on the game (a captain: confirmed; a supervisor: present). */
export const addRosterPlayer = (seasonId: string, matchId: string, playerId: string) =>
  request<void>("PUT", url`/api/seasons/${seasonId}/matches/${matchId}/roster/${playerId}`);

export const addByNetid = (seasonId: string, matchId: string, add: NetidAdd) =>
  request<NetidAddResult>("POST", url`/api/seasons/${seasonId}/matches/${matchId}/roster/netid`, { body: add });
