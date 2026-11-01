// What a game's result does: the two colleges' standings and the two teams'
// records (lib/results.ts has the table), applied (+1) when the game is
// scored and taken back (-1) when the score is undone or its bracket deleted,
// inside the caller's transaction. Standings and records have this one writer.
import "server-only";
import {
  FieldValue,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction,
} from "firebase-admin/firestore";
import { standingDeltas, teamDeltas } from "@/lib/results";
import type { MatchDoc, MatchResult } from "@/types/firestore";
import { collegeRef } from "../data/colleges";
import { newTeam, teamRef } from "../data/teams";

/** A game with a result between two known colleges. */
export type ScoredGame = MatchDoc & {
  homeCollegeId: string;
  awayCollegeId: string;
  result: MatchResult;
};

export function isScoredGame(m: MatchDoc): m is ScoredGame {
  return m.status === "final" && !!m.result && !!m.homeCollegeId && !!m.awayCollegeId;
}

/** The colleges' and teams' docs a game's result changes. */
function docsChangedBy(seasonId: string, g: ScoredGame): DocumentReference[] {
  return [
    collegeRef(seasonId, g.homeCollegeId),
    collegeRef(seasonId, g.awayCollegeId),
    teamRef(seasonId, g.homeCollegeId, g.sportId),
    teamRef(seasonId, g.awayCollegeId, g.sportId),
  ];
}

/**
 * Reads, inside `tx`, every doc these games' results change (for the audit
 * log, and to know which teams exist yet). Call before any write.
 */
export async function readStandingDocs(
  tx: Transaction,
  seasonId: string,
  games: ScoredGame[]
): Promise<DocumentSnapshot[]> {
  const refs = new Map(games.flatMap((g) => docsChangedBy(seasonId, g)).map((r) => [r.path, r]));
  return refs.size > 0 ? tx.getAll(...refs.values()) : [];
}

/**
 * Applies (+1) or takes back (-1) a game's result. `read`: what
 * readStandingDocs returned in this transaction. A team plays its first
 * game here: its doc is created.
 */
export function applyResult(
  tx: Transaction,
  seasonId: string,
  game: ScoredGame,
  sign: 1 | -1,
  read: DocumentSnapshot[]
): void {
  const { homeCollegeId: home, awayCollegeId: away, result } = game;
  const increments = (delta: Record<string, number | undefined>) =>
    Object.fromEntries(
      Object.entries(delta).map(([field, n]) => [field, FieldValue.increment(sign * (n ?? 0))])
    );

  for (const [collegeId, delta] of Object.entries(standingDeltas(home, away, result, game.pointsForWin))) {
    tx.update(collegeRef(seasonId, collegeId), increments(delta));
  }
  for (const [collegeId, delta] of Object.entries(teamDeltas(home, away, result))) {
    const ref = teamRef(seasonId, collegeId, game.sportId);
    if (read.find((s) => s.ref.path === ref.path)?.exists) {
      tx.update(ref, increments(delta));
    } else if (sign === 1) {
      tx.create(ref, { ...newTeam(seasonId, collegeId, game.sportId), ...delta });
    }
  }
}
