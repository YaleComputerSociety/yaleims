// What a game's result does to the standings and to the two teams' records:
// one table for scoring (+1) and undoing or deleting (-1) a result. Pure, so
// the scoring service and the migration's standings check (database/migrate)
// count the same way.
import type { MatchResult, StandingStats, TeamDoc } from "../types/firestore";

export type StandingDelta = Partial<StandingStats>;
export type TeamRecord = Pick<
  TeamDoc,
  "games" | "wins" | "losses" | "ties" | "forfeits" | "pointsFor" | "pointsAgainst"
>;
export type TeamDelta = Partial<TeamRecord>;

/**
 * What a result adds to each college's standing: a win earns the sport's
 * points, a draw or a double forfeit half of them to each side; a forfeiting
 * loser counts a forfeit instead of a loss.
 */
export function standingDeltas(
  homeCollegeId: string,
  awayCollegeId: string,
  result: Pick<MatchResult, "outcome" | "forfeit">,
  pointsForWin: number
): Record<string, StandingDelta> {
  const half = pointsForWin / 2;
  const win: StandingDelta = { games: 1, wins: 1, points: pointsForWin };
  const loss: StandingDelta = result.forfeit ? { games: 1, forfeits: 1 } : { games: 1, losses: 1 };
  switch (result.outcome) {
    case "home":
      return { [homeCollegeId]: win, [awayCollegeId]: loss };
    case "away":
      return { [homeCollegeId]: loss, [awayCollegeId]: win };
    case "draw":
      return {
        [homeCollegeId]: { games: 1, ties: 1, points: half },
        [awayCollegeId]: { games: 1, ties: 1, points: half },
      };
    case "double_forfeit":
      return {
        [homeCollegeId]: { games: 1, forfeits: 1, points: half },
        [awayCollegeId]: { games: 1, forfeits: 1, points: half },
      };
  }
}

/** What a result adds to each college's team record in the game's sport. */
export function teamDeltas(
  homeCollegeId: string,
  awayCollegeId: string,
  result: MatchResult
): Record<string, TeamDelta> {
  const home = result.homeScore ?? 0;
  const away = result.awayScore ?? 0;
  const counts = standingDeltas(homeCollegeId, awayCollegeId, result, 0);
  const record = (id: string, pointsFor: number, pointsAgainst: number): TeamDelta => {
    // The same counts as the standing, without its points.
    const { points: _points, ...counted } = counts[id];
    return { ...counted, pointsFor, pointsAgainst };
  };
  return {
    [homeCollegeId]: record(homeCollegeId, home, away),
    [awayCollegeId]: record(awayCollegeId, away, home),
  };
}

/** The winning college, or null for a draw or double forfeit. */
export function winnerId(
  homeCollegeId: string | null,
  awayCollegeId: string | null,
  result: Pick<MatchResult, "outcome">
): string | null {
  if (result.outcome === "home") return homeCollegeId;
  if (result.outcome === "away") return awayCollegeId;
  return null;
}
