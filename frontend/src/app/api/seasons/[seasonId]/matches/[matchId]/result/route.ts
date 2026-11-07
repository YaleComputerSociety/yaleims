import { ApiError } from "@/lib/api/core";
import { matchCorrectionSchema, matchResultSchema } from "@/lib/api/matches";
import { authorize, can } from "@/server/auth";
import { noContent, readBody, route } from "@/server/http";
import { correctScore, scoreMatch, undoScore } from "@/server/services/scoring";

type Params = { seasonId: string; matchId: string };

/**
 * Records a game's result: standings, team records, the bracket and the
 * audit log change with it (supervisors). A scored game is undone first.
 */
export const PUT = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await authorize(can.score);
  const result = await readBody(req, matchResultSchema);
  const outcome = await scoreMatch({ seasonId, matchId, ...result }, await viewer.actor());
  if (outcome === "not-found") throw new ApiError("not-found", "No such game this season.");
  if (outcome === "already-scored") throw new ApiError("conflict", "This game is already scored; correct or undo the score.");
  if (outcome === "cancelled") throw new ApiError("conflict", "Restore this cancelled game before scoring it.");
  if (outcome === "incomplete") throw new ApiError("bad-request", "The game has no college on one side; name both.");
  if (outcome === "unknown-college") throw new ApiError("bad-request", "A game's college does not exist this season.");
  return noContent();
});

/** Corrects a scored game's result in one step (supervisors; audit-logged). */
export const PATCH = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await authorize(can.score);
  const correction = await readBody(req, matchCorrectionSchema);
  const outcome = await correctScore({ seasonId, matchId, ...correction }, await viewer.actor());
  if (outcome === "not-found") throw new ApiError("not-found", "No such game this season.");
  if (outcome === "incomplete") throw new ApiError("conflict", "This game has no result; score it instead.");
  if (outcome === "winner-changes") {
    throw new ApiError("conflict", "This changes the bracket game's winner: undo the score (later rounds first) and score it again.");
  }
  return noContent();
});

/** Clears a game's result and takes its points back (supervisors; audit-logged). */
export const DELETE = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await authorize(can.score);
  const outcome = await undoScore(seasonId, matchId, await viewer.actor());
  if (outcome === "not-found") throw new ApiError("not-found", "No such game this season.");
  if (outcome === "incomplete") throw new ApiError("conflict", "This game has no result.");
  return noContent();
});
