// Who sees a game's participants, and which (NAMES-AND-PARTICIPANTS-PLAN,
// decisions D-P1–D-P4): supervisors and admins see every game; a player sees
// the games their college plays in, and anyone on a game sees that game,
// both sides each time. Each side lists who signed up or was put on it (not
// those taken off) until a supervisor records one of its players present,
// at any time; from then on only those recorded present, the only attendance
// that counts (lib/attendance.ts; user, 2026-11-10).
import type { RosterEntryDoc } from "@/types/firestore";

export interface ParticipantsViewer {
  /** A supervisor or an admin. */
  staff: boolean;
  /** Their college in the game's season; null: none. */
  collegeId: string | null;
  /** On the game (not taken off). */
  onGame: boolean;
}

export function seesParticipants(viewer: ParticipantsViewer, game: { collegeIds: string[] }): boolean {
  return viewer.staff || viewer.onGame || (viewer.collegeId !== null && game.collegeIds.includes(viewer.collegeId));
}

/** The entries to list, side by side: its players, or once attendance is being taken on that side, those recorded present. */
export function shownEntries<T extends Pick<RosterEntryDoc, "collegeId" | "captainStatus" | "present">>(entries: T[]): T[] {
  const taking = new Set(entries.filter((e) => e.present === true).map((e) => e.collegeId));
  return entries.filter((e) => (taking.has(e.collegeId) ? e.present === true : e.captainStatus !== "removed"));
}
