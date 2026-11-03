// The roster API: who is on a game (/api/seasons/{s}/matches/{m}/roster)
// and the caller's own sign-up (…/roster/me). Signing up and withdrawing
// follow D34 (services/signups.ts).
import type { RosterEntryDoc } from "@/types/firestore";
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
