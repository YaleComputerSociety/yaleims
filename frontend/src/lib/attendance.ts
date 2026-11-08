// Which attendance counts (account plan, decisions 3c, 4a, 4c). Only presence
// a supervisor recorded counts, for every statistic. A recorded game is
// "under review" (disputed) when its side isn't the college the player held
// when it was played, until an admin confirms it. Computed on read, from the
// season player's college history and their entries, so nothing stored goes
// stale: counts, the Profile and the admin views all call `disputed`.
import type { PlayerDoc } from "@/types/firestore";

/** One college assignment, in milliseconds; collegeId null: cleared. */
export interface Assignment {
  collegeId: string | null;
  since: number;
}

/** A game the player was recorded present at: its side and start. */
export interface Attended {
  collegeId: string;
  startsAt: number;
  /** An admin confirmed this entry: never disputed. */
  adminConfirmed: boolean;
}

/**
 * A season player's assignments, oldest first. A doc from before November
 * 2026 has no history: its college counts as assigned when they joined.
 */
export function assignmentsOf(player: Pick<PlayerDoc, "collegeId" | "collegeHistory" | "joinedAt">): Assignment[] {
  if (player.collegeHistory) {
    return player.collegeHistory.map((a) => ({ collegeId: a.collegeId, since: a.since.toMillis() }));
  }
  return player.collegeId ? [{ collegeId: player.collegeId, since: player.joinedAt.toMillis() }] : [];
}

/**
 * The college a game played at `startsAt` should be for: the one assigned
 * at its start; with none then, the first assigned after it; null if none.
 */
export function expectedCollege(assignments: Assignment[], startsAt: number): string | null {
  const atStart = assignments.filter((a) => a.since <= startsAt).at(-1);
  if (atStart?.collegeId) return atStart.collegeId;
  return assignments.find((a) => a.since > startsAt && a.collegeId)?.collegeId ?? null;
}

/**
 * For each entry, whether it is under review: its side isn't its expected
 * college; or it has none, and the season's entries without one aren't all
 * for one college. An admin's confirmation overrides both.
 */
export function disputed(assignments: Assignment[], entries: Attended[]): boolean[] {
  const expected = entries.map((e) => expectedCollege(assignments, e.startsAt));
  const unexpectedSides = new Set(entries.filter((_, i) => !expected[i]).map((e) => e.collegeId));
  return entries.map((e, i) => {
    if (e.adminConfirmed) return false;
    return expected[i] ? e.collegeId !== expected[i] : unexpectedSides.size > 1;
  });
}
