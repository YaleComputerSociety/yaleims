// The roster API: who is on a game (/api/seasons/{s}/matches/{m}/roster),
// the caller's own sign-up (…/roster/me), and the sheet captains and
// supervisors work on (…/roster/sheet, …/roster/{playerId}, …/roster/netid).
// The rules follow D34 (services/signups.ts, services/roster.ts).
import { z } from "zod";
import type { RosterEntryDoc } from "@/types/firestore";
import { collegeIdSchema } from "./colleges";
import { NETID_PATTERN } from "../netid";
import { request, toJson, url, type Json } from "./core";
import type { Identity } from "./users";

/** An entry for its player or on the sheet: without who made the calls (supervisors stay anonymous; the sheet names captains). */
export type RosterEntry = Json<Omit<RosterEntryDoc, "captainBy" | "captainByRole" | "presentBy" | "beforeTakeOff">>;

export function toOwnEntry({
  captainBy: _captainBy,
  captainByRole: _captainByRole,
  presentBy: _presentBy,
  beforeTakeOff: _beforeTakeOff,
  ...entry
}: RosterEntryDoc): RosterEntry {
  return toJson(entry);
}

/** Who made the captain's call on a sheet entry, by role, and by name (or NetID) for a captain; a supervisor's name only for staff (null: not shown, or unknown). */
export interface CaptainCall {
  by: "captain" | "supervisor";
  name: string | null;
}

/** An entry as the game's participants are shown: college and status, no ids (the name and NetID come with Identity). */
export type PublicRosterEntry = Json<
  Omit<RosterEntryDoc, "playerId" | "addedByUser" | "captainBy" | "captainByRole" | "presentBy" | "attendanceConfirmedBy" | "beforeTakeOff">
>;

export function toPublicEntry({
  playerId: _playerId,
  addedByUser: _addedByUser,
  captainBy: _captainBy,
  captainByRole: _captainByRole,
  presentBy: _presentBy,
  attendanceConfirmedBy: _attendanceConfirmedBy,
  beforeTakeOff: _beforeTakeOff,
  ...entry
}: RosterEntryDoc): PublicRosterEntry {
  return toJson(entry);
}

/**
 * GET …/roster (signed in): the game's participants, in sign-up order, for
 * those who may see them (`visible`, lib/participants.ts): each side's
 * players, or once a supervisor takes attendance on that side, those
 * recorded present; whether the game has `started`; and the caller's own
 * entry (a removed one too, so the page can say why they can't sign up).
 */
export interface Roster {
  visible: boolean;
  started: boolean;
  items: (PublicRosterEntry & Identity)[];
  total: number;
  mine: RosterEntry | null;
}

export const fetchRoster = (seasonId: string, matchId: string) =>
  request<Roster>("GET", url`/api/seasons/${seasonId}/matches/${matchId}/roster`);

/**
 * PUT …/roster/me: signs the caller up, on their college's side (already on
 * it: fine); their entry (a captain's is pre-confirmed; null: gone again at
 * once, when the game's teams were just replaced).
 */
export const signUp = (seasonId: string, matchId: string) =>
  request<RosterEntry | null>("PUT", url`/api/seasons/${seasonId}/matches/${matchId}/roster/me`);

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
  /** A supervisor: confirms who came (attendance), takes players off or puts them back, any time. */
  supervisor: boolean;
  /** The sides the caller captains: pre-confirm, take off and add there, until the start (a supervisor may captain too). */
  captainOf: string[];
  /**
   * Each entry with the player's identity (their NetID tells same-named
   * players apart; null: none recorded yet, or a placeholder "netid-<netid>",
   * whose id holds it; emails for admins); whether they have signed in (an
   * account made for them stays unclaimed until then); whether they have a
   * college this season; who made the captain's call (co-captains share one
   * call per player: the last one counts; null: no call).
   */
  items: (RosterEntry & Identity & { signedIn: boolean; collegeAssigned: boolean; captainCall: CaptainCall | null })[];
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

/** PUT …/roster/{playerId}: the side (a college of the game); without it, the player's college this season. */
export const rosterAddSchema = z.strictObject({ collegeId: collegeIdSchema.optional() });
export type RosterAdd = z.infer<typeof rosterAddSchema>;

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

/** PUT …/roster/{playerId}: puts a season player on a side of the game (a captain: confirmed; a supervisor: present). */
export const addRosterPlayer = (seasonId: string, matchId: string, playerId: string, add: RosterAdd = {}) =>
  request<void>("PUT", url`/api/seasons/${seasonId}/matches/${matchId}/roster/${playerId}`, { body: add });

export const addByNetid = (seasonId: string, matchId: string, add: NetidAdd) =>
  request<NetidAddResult>("POST", url`/api/seasons/${seasonId}/matches/${matchId}/roster/netid`, { body: add });
