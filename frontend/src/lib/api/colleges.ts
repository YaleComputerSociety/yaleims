// The colleges API: what belongs to a college in a season, under
// /api/seasons/{seasonId}/colleges/{collegeId}: its players, leaders,
// captains and weekly MVPs.
import { z } from "zod";
import { COLLEGES } from "@/lib/colleges";
import type { PlayerDoc, WithId } from "@/types/firestore";
import { request, url, type Json } from "./core";

const COLLEGE_IDS: string[] = COLLEGES.map((c) => c.id);

/** A college id ("MC"); the 14 are the same every season. A string, as the docs store it. */
export const collegeIdSchema = z.string().refine((id) => COLLEGE_IDS.includes(id), "Unknown college");

// ── Players and leaders ────────────────────────────────────────────────────

/** A college's player this season, with the sports (ids) they captain. */
export type CollegePlayer = Json<WithId<PlayerDoc>> & { captainOf: string[] };

/** GET …/colleges/{c}/players (the college's rep, devs; current season): by name. */
export interface CollegePlayerList {
  items: CollegePlayer[];
  total: number;
}

/** GET …/colleges/{c}/leaders (the college's own players): its reps (the college's contacts) and captains. */
export interface CollegeLeaders {
  reps: { playerId: string; name: string }[];
  captains: { sportId: string; name: string }[];
}

export const fetchCollegePlayers = (seasonId: string, collegeId: string) =>
  request<CollegePlayerList>("GET", url`/api/seasons/${seasonId}/colleges/${collegeId}/players`);

export const fetchCollegeLeaders = (seasonId: string, collegeId: string) =>
  request<CollegeLeaders>("GET", url`/api/seasons/${seasonId}/colleges/${collegeId}/leaders`);

// ── Captains (the college's rep, admins; current season) ───────────────────

const captainPath = (seasonId: string, collegeId: string, sportId: string, email: string) =>
  url`/api/seasons/${seasonId}/colleges/${collegeId}/teams/${sportId}/captains/${email}`;

/** PUT: makes the college's player captain of its team in the sport. */
export const assignCaptain = (seasonId: string, collegeId: string, sportId: string, email: string) =>
  request<void>("PUT", captainPath(seasonId, collegeId, sportId, email));

/** DELETE: makes them not captain (not one: fine). */
export const removeCaptain = (seasonId: string, collegeId: string, sportId: string, email: string) =>
  request<void>("DELETE", captainPath(seasonId, collegeId, sportId, email));
