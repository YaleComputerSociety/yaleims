// The session API: who is signed in (GET /api/auth/session) and signing out
// (POST /api/auth/logout). Signing in is a page navigation to
// /api/auth/login?from=<page> (Yale CAS), not a call.
import type { DirectoryOutcome, GlobalRole, SeasonRole } from "@/types/firestore";
import { request } from "./core";

/**
 * A "Sign in" link: Yale CAS, then back to `from`, a page of this site (the
 * current one, usually); from the failed sign-in page, back home.
 */
export const signInUrl = (from: string) =>
  `/api/auth/login?from=${encodeURIComponent(from === "/sign-in-failed" ? "/" : from)}`;

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
  /** People and review requests (admins). */
  managePeople: boolean;
}

/** The signed-in person, with what they are this season. */
export interface SessionViewer {
  /** Their account's id (an email for accounts from before November 2026, else "netid-<netid>"). */
  userId: string;
  /** Contact address; null: none known yet. */
  email: string | null;
  /** Their name, or their NetID when none is known. */
  name: string;
  /** They may set their name: none yet, one they typed or a captain's label (not the directory's or an admin's). */
  canEditName: boolean;
  /** Their last directory lookup and when "Check Yalies again" opens; null: none recorded. */
  directory: { outcome: DirectoryOutcome | null; checkedAt: string | null; retryAt: string } | null;
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
