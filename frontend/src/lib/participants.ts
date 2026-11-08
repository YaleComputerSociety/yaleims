// Who sees a game's participants, and which (NAMES-AND-PARTICIPANTS-PLAN,
// decisions D-P1–D-P4): supervisors and admins see every game; a player sees
// the games their college plays in, and anyone on a game sees that game,
// both sides each time. Until the start they see who signed up or was put on
// it (not those a captain took off); from the start only those a supervisor
// recorded present, the only attendance that counts (lib/attendance.ts).
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

/** The entries to list: before the start the game's players; from it those recorded present. */
export function shownEntries<T extends Pick<RosterEntryDoc, "captainStatus" | "present">>(entries: T[], started: boolean): T[] {
  return entries.filter((e) => (started ? e.present === true : e.captainStatus !== "removed"));
}
