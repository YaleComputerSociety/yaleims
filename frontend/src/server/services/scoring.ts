// Scoring a game and undoing it. One transaction each: the game's result,
// both colleges' standings and teams' records, the bracket (winner moves on,
// placement bonuses) and the audit entry. Then the season is re-ranked.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import type { MatchDoc, MatchResult, Outcome } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { recalculateRanks } from "../data/colleges";
import { matchRef } from "../data/matches";
import { runTransaction } from "../data/util";
import { applyBracketMoves, movedDocs, readBracketMoves, reversePlacements } from "./brackets";
import { applyResult, isScoredGame, readStandingDocs } from "./standings";

export interface ScoreInput {
  seasonId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  homeForfeit: boolean;
  awayForfeit: boolean;
  /** Used only when the game has no college on that side yet. */
  homeCollegeId?: string;
  awayCollegeId?: string;
}

/** The outcome of a score: a forfeit loses, two forfeits are a double forfeit, equal scores a draw. */
function outcomeOf(input: ScoreInput): Outcome {
  if (input.homeForfeit && input.awayForfeit) return "double_forfeit";
  if (input.homeForfeit) return "away";
  if (input.awayForfeit) return "home";
  if (input.homeScore === input.awayScore) return "draw";
  return input.homeScore > input.awayScore ? "home" : "away";
}

export async function scoreMatch(
  input: ScoreInput,
  actor: Actor
): Promise<"scored" | "not-found" | "already-scored" | "incomplete"> {
  const { seasonId } = input;
  const ref = matchRef(seasonId, input.matchId);
  const outcome = await runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const match = snap.data();
    if (!match) return "not-found" as const;
    if (match.status === "final") return "already-scored" as const;
    const homeCollegeId = match.homeCollegeId ?? input.homeCollegeId ?? null;
    const awayCollegeId = match.awayCollegeId ?? input.awayCollegeId ?? null;
    if (!homeCollegeId || !awayCollegeId) return "incomplete" as const;

    const result: MatchResult = {
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      outcome: outcomeOf(input),
      forfeit: input.homeForfeit || input.awayForfeit,
    };
    const scored: MatchDoc = {
      ...match,
      homeCollegeId,
      awayCollegeId,
      collegeIds: [...new Set([homeCollegeId, awayCollegeId])],
      status: "final",
      result,
    };
    if (!isScoredGame(scored)) return "incomplete" as const;
    const standingDocs = await readStandingDocs(tx, seasonId, [scored]);
    const moves = await readBracketMoves(tx, seasonId, scored);

    tx.update(ref, {
      homeCollegeId,
      awayCollegeId,
      collegeIds: scored.collegeIds,
      status: "final",
      result,
      scoredBy: actor.userId,
      scoredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    applyResult(tx, seasonId, scored, 1, standingDocs);
    applyBracketMoves(tx, seasonId, scored, moves);
    logAction(tx, seasonId, {
      actor,
      action: "scoreMatch",
      params: input,
      changed: [snap, ...standingDocs, ...movedDocs(moves)],
    });
    return "scored" as const;
  });
  if (outcome === "scored") await recalculateRanks(seasonId);
  return outcome;
}

/**
 * Clears a game's result and takes its points back (and the placement
 * bonuses it settled). Bracket advancement is not undone: the next game keeps
 * the college that moved in. "incomplete": the game has no result.
 */
export async function undoScore(
  seasonId: string,
  matchId: string,
  actor: Actor
): Promise<"undone" | "not-found" | "incomplete"> {
  const ref = matchRef(seasonId, matchId);
  const outcome = await runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const match = snap.data();
    if (!match) return "not-found" as const;
    if (!isScoredGame(match)) return "incomplete" as const;
    const standingDocs = await readStandingDocs(tx, seasonId, [match]);
    const moves = await readBracketMoves(tx, seasonId, match);

    tx.update(ref, {
      status: "scheduled",
      result: null,
      scoredBy: null,
      scoredAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    applyResult(tx, seasonId, match, -1, standingDocs);
    reversePlacements(tx, seasonId, match, moves);
    logAction(tx, seasonId, {
      actor,
      action: "undoScoreMatch",
      params: { matchId },
      changed: [snap, ...standingDocs, ...(moves.bracket?.exists ? [moves.bracket] : [])],
    });
    return "undone" as const;
  });
  if (outcome === "undone") await recalculateRanks(seasonId);
  return outcome;
}
