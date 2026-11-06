// Scoring a game and undoing it. One transaction each: the game's result,
// both colleges' standings and teams' records, the bracket (winner moves on,
// placement bonuses) and the audit entry. Then the season is re-ranked.
// A result is locked while a game it feeds has a score: undo later rounds first.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { ApiError } from "@/lib/api/core";
import { matchTeamsProblem, scoreStateProblem } from "@/lib/matchRules";
import type { MatchDoc, MatchResult, Outcome } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { collegeRef, recalculateRanks } from "../data/colleges";
import { matchRef } from "../data/matches";
import { runTransaction } from "../data/util";
import { advancingMatches, applyBracketMoves, movedDocs, readBracketMoves, reversePlacements } from "./brackets";
import { applyRosterChanges, readRosterChanges } from "./matchRoster";
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
): Promise<"scored" | "not-found" | "already-scored" | "cancelled" | "incomplete" | "unknown-college"> {
  const { seasonId } = input;
  const ref = matchRef(seasonId, input.matchId);
  const outcome = await runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const match = snap.data();
    if (!match) return "not-found" as const;
    const stateProblem = scoreStateProblem(match.status);
    if (stateProblem) return stateProblem;
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
    const problem = matchTeamsProblem(scored);
    if (problem) throw new ApiError("bad-request", problem);
    if (!isScoredGame(scored)) return "incomplete" as const;
    const moves = await readBracketMoves(tx, seasonId, scored);
    const advancements = advancingMatches(scored, moves);
    const standingDocs = await readStandingDocs(tx, seasonId, [scored]);
    // Reuse the transaction's standing snapshots to verify season membership.
    const known = (id: string) => standingDocs.some((doc) => doc.ref.path === collegeRef(seasonId, id).path && doc.exists);
    if (!known(homeCollegeId) || !known(awayCollegeId)) return "unknown-college" as const;
    const changed = [snap, ...standingDocs, ...movedDocs(moves)];
    const roster = await readRosterChanges(tx, seasonId, [{ before: snap, after: scored }, ...advancements], changed);

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
    applyBracketMoves(tx, seasonId, scored, moves, advancements);
    applyRosterChanges(tx, roster);
    logAction(tx, seasonId, {
      actor,
      action: "scoreMatch",
      params: input,
      changed: [...changed, ...roster.map((c) => c.before)],
    });
    return "scored" as const;
  });
  if (outcome === "scored") await recalculateRanks(seasonId);
  return outcome;
}

/**
 * Clears a game's result and takes its points back (and the placement
 * bonuses it settled), after the next round's scores have been undone.
 * Bracket advancement is retained: the next game keeps the college that
 * moved in. "incomplete": the game has no result.
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
    const moves = await readBracketMoves(tx, seasonId, match);
    const standingDocs = await readStandingDocs(tx, seasonId, [match]);

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
