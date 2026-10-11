// Tournaments: a 16-slot bracket (the playoff shape plus a third place game)
// whose matches are ordinary match docs, plus placement bonus points on top
// of the per-win points. Changes touch the tournament, its matches and the
// college standings, so each runs in one transaction.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { collegeStandingRef } from "../data/colleges";
import { matchRef } from "../data/matches";
import { getPointsForWin } from "../data/sports";
import { tournamentRef } from "../data/tournaments";
import { runTransaction } from "../data/util";

export interface PlacementPoints {
  first: number;
  second: number;
  third: number;
}

export const DEFAULT_PLACEMENT_POINTS: PlacementPoints = {
  first: 20,
  second: 15,
  third: 10,
};

/** Stored placement points, with the default for any missing or invalid value. */
export function normalizePlacementPoints(raw: any): PlacementPoints {
  const toNumber = (value: any, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
  return {
    first: toNumber(raw?.first, DEFAULT_PLACEMENT_POINTS.first),
    second: toNumber(raw?.second, DEFAULT_PLACEMENT_POINTS.second),
    third: toNumber(raw?.third, DEFAULT_PLACEMENT_POINTS.third),
  };
}

export type DeleteTournamentResult =
  | { status: "deleted"; matchCount: number }
  | { status: "not-found" }
  | { status: "has-scored-matches"; scoredMatchIds: string[] };

/**
 * Deletes a tournament and its matches, and takes back the points it handed
 * out at creation (bye wins) and as placement bonuses. Refuses while any
 * non-bye match is scored unless `force`, because those win points would be
 * stranded; undo those scores first.
 */
export async function deleteTournament(
  seasonId: string,
  tournamentId: string,
  force: boolean
): Promise<DeleteTournamentResult> {
  const ref = tournamentRef(seasonId, tournamentId);
  return runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const tournament = snap.data();
    if (!tournament) return { status: "not-found" };

    const entries = tournament.matches || [];
    const matchRefs = entries.map((entry) => matchRef(seasonId, entry.match_id));
    const matchSnaps = matchRefs.length > 0 ? await tx.getAll(...matchRefs) : [];

    const scoredMatchIds = matchSnaps
      .filter((s) => s.exists && s.data()?.winner && s.data()?.type !== "Bye")
      .map((s) => s.id);
    if (scoredMatchIds.length > 0 && !force) {
      return { status: "has-scored-matches", scoredMatchIds };
    }

    const pointsForWin = await getPointsForWin(tournament.sport, tx);

    for (const matchDocRef of matchRefs) {
      tx.delete(matchDocRef);
    }
    // Byes were credited as wins at creation time.
    for (const s of matchSnaps) {
      const match = s.data();
      if (!match || match.type !== "Bye" || !match.winner) continue;
      tx.update(collegeStandingRef(seasonId, match.winner), {
        games: FieldValue.increment(-1),
        wins: FieldValue.increment(-1),
        points: FieldValue.increment(-pointsForWin),
      });
    }
    const points = normalizePlacementPoints(tournament.placement_points);
    const placements = tournament.placements || {};
    const awarded: [string | null | undefined, number][] = [
      [placements.first, points.first],
      [placements.second, points.second],
      [placements.third, points.third],
    ];
    for (const [college, bonus] of awarded) {
      if (!college) continue;
      tx.update(collegeStandingRef(seasonId, college), {
        points: FieldValue.increment(-bonus),
      });
    }
    tx.delete(ref);
    return { status: "deleted", matchCount: entries.length };
  });
}
