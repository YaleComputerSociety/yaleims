// What results do to the college standings: one table for scoring (+1) and
// undoing or deleting (-1) a result.
import "server-only";
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { collegeStandingRef } from "../data/colleges";
import type { MatchDoc } from "../data/matches";
import { getPointsForWin } from "../data/sports";

/** A college name, or "Draw", or "Default" (both sides forfeited). */
export type Winner = string;

type StatField = "games" | "wins" | "losses" | "ties" | "forfeits" | "points";
type StandingChanges = Record<string, Partial<Record<StatField, number>>>;

/**
 * What a result adds to each college's standing. Undoing a result applies
 * the same changes negated. A winner matching neither college changes nothing.
 */
export function standingChanges(
  home: string,
  away: string,
  winner: Winner,
  forfeit: boolean,
  pointsForWin: number
): StandingChanges {
  const half = pointsForWin / 2;
  const win = { games: 1, wins: 1, points: pointsForWin };
  const lossOrForfeit = forfeit ? { games: 1, forfeits: 1 } : { games: 1, losses: 1 };
  if (winner === "Default") {
    return {
      [home]: { games: 1, forfeits: 1, points: half },
      [away]: { games: 1, forfeits: 1, points: half },
    };
  }
  if (winner === "Draw") {
    return {
      [home]: { games: 1, ties: 1, points: half },
      [away]: { games: 1, ties: 1, points: half },
    };
  }
  if (winner === home) return { [home]: win, [away]: lossOrForfeit };
  if (winner === away) return { [home]: lossOrForfeit, [away]: win };
  return {};
}

export function applyStandingChanges(
  tx: Transaction,
  seasonId: string,
  changes: StandingChanges,
  sign: 1 | -1
): void {
  for (const [college, fields] of Object.entries(changes)) {
    const update = Object.fromEntries(
      Object.entries(fields).map(([field, delta]) => [field, FieldValue.increment(sign * delta)])
    );
    tx.update(collegeStandingRef(seasonId, college), update);
  }
}

/**
 * Reads, inside `tx`, what reversing these games' results needs: the
 * points_for_win of each sport among the scored ones. Call before any write.
 */
export async function readPointsForWin(
  tx: Transaction,
  matches: MatchDoc[]
): Promise<Map<string, number>> {
  const sports = [...new Set(matches.filter(isScoredGame).map((m) => m.sport))];
  const points = await Promise.all(sports.map((sport) => getPointsForWin(sport, tx)));
  return new Map(sports.map((sport, i) => [sport, points[i]]));
}

/** A game with a result that changed the standings (byes never do, D23). */
export function isScoredGame(match: MatchDoc): boolean {
  return !!match.winner && match.type !== "Bye";
}

/** Takes back the standing changes of every scored game in `matches`. */
export function reverseResults(
  tx: Transaction,
  seasonId: string,
  matches: MatchDoc[],
  pointsForWin: Map<string, number>
): void {
  for (const m of matches.filter(isScoredGame)) {
    const changes = standingChanges(
      m.home_college,
      m.away_college,
      m.winner!,
      !!m.forfeit,
      pointsForWin.get(m.sport)!
    );
    applyStandingChanges(tx, seasonId, changes, -1);
  }
}
