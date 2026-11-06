// Match domain rules shared by all server writers. Pending bracket games may
// have TBD opponents; a bye is a bracket slot, never a regular-season game.
import type { MatchDoc, MatchStatus } from "@/types/firestore";

export function matchTeamsProblem(match: Pick<MatchDoc, "stage" | "homeCollegeId" | "awayCollegeId">): string | null {
  const { homeCollegeId: home, awayCollegeId: away } = match;
  if (home && home === away) return "A game must have two different colleges.";
  if (match.stage === "regular" && (!home || !away)) return "A regular-season game needs two colleges.";
  return null;
}

/** A cancelled game must be restored, and a final result must be undone first. */
export function scoreStateProblem(status: MatchStatus): "already-scored" | "cancelled" | null {
  if (status === "final") return "already-scored";
  if (status === "cancelled") return "cancelled";
  return null;
}
