// The session API: who is signed in (GET /api/auth/session) and signing out
// (POST /api/auth/logout). Signing in is a page navigation to
// /api/auth/login?from=<page> (Yale CAS), not a call.
import type { GlobalRole, SeasonRole } from "@/types/firestore";
import { request } from "./core";

/** What the viewer may do anywhere (server/auth.ts `can`); per-college and per-team rights are checked by each call. */
export interface ViewerPermissions {
  /** Create, edit, cancel and delete games, brackets and tournaments. */
  editSchedule: boolean;
  /** Score games; see and resolve score reports. */
  score: boolean;
  /** Game day: take attendance at any game. */
  takeAttendance: boolean;
  setChampion: boolean;
  manageRoles: boolean;
}

/** The signed-in person, with what they are this season. */
export interface SessionViewer {
  email: string;
  name: string;
  username: string;
  /** Their college this season; null: none (or not a player). */
  collegeId: string | null;
  /** Global roles (admin, dev) and this season's (college_rep, supervisor). */
  roles: (GlobalRole | SeasonRole)[];
  /** The sports (ids) whose teams they captain this season. */
  captainOf: string[];
  can: ViewerPermissions;
}

export type SessionState = { signedIn: false } | { signedIn: true; viewer: SessionViewer };

export const fetchSession = () => request<SessionState>("GET", "/api/auth/session");

/** Ends the session (the page then goes home). */
export const logout = () => request<void>("POST", "/api/auth/logout");
