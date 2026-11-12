// A player's place on a game, in three levels, lowest to highest (C17, user
// 2026-11-12): signed up (by themselves, or added by a captain); pre-confirmed
// by a captain (✓), which only prepares the roster so the supervisor needn't
// look each player up; confirmed by the supervisor (✓✓: they came), the final
// word and the only one that counts (lib/attendance.ts). Every screen names
// them with these words, in this order. Stored as captainStatus "confirmed"
// and present true.
import type { RosterEntryDoc } from "@/types/firestore";

export type Level = "signed-up" | "pre-confirmed" | "confirmed";

export const LEVELS: Record<Level, { mark: string; label: string }> = {
  "signed-up": { mark: "", label: "signed up" },
  "pre-confirmed": { mark: "✓", label: "pre-confirmed by captain" },
  confirmed: { mark: "✓✓", label: "confirmed by supervisor" },
};

/** An entry's highest level (an entry taken off isn't on the game: callers leave it out). */
export function levelOf(entry: Pick<RosterEntryDoc, "captainStatus" | "present">): Level {
  if (entry.present === true) return "confirmed";
  return entry.captainStatus === "confirmed" ? "pre-confirmed" : "signed-up";
}

/** The marks explained, lowest first. */
export const LEGEND = "✓ pre-confirmed by captain · ✓✓ confirmed by supervisor (final: the only one that counts)";
