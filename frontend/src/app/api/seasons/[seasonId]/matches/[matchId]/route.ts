import { ApiError } from "@/lib/api/core";
import { matchEditSchema, toMatch } from "@/lib/api/matches";
import { authorize, can } from "@/server/auth";
import { getMatch } from "@/server/data/matches";
import { noContent, ok, readBody, route } from "@/server/http";
import { deleteMatch, editMatch, type DeleteResult, type EditResult } from "@/server/services/schedule";

type Params = { seasonId: string; matchId: string };

/** One game (public, like the season's list). */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const match = await getMatch(seasonId, matchId);
  if (!match) throw new ApiError("not-found", "No such game this season.");
  return ok(toMatch({ id: matchId, ...match }));
});

const REFUSALS: Record<Exclude<EditResult, "ok">, ApiError> = {
  "not-found": new ApiError("not-found", "No such game this season."),
  scored: new ApiError("conflict", "A scored game's colleges and sport can't change, nor can it be cancelled; undo the score first."),
  "unknown-sport": new ApiError("bad-request", "No such sport this season."),
  "unknown-college": new ApiError("bad-request", "Unknown college."),
  "bad-time": new ApiError("bad-request", "Invalid start time."),
};

/** Changes a game's colleges, sport, venue or start, or cancels it (supervisors; audit-logged). */
export const PATCH = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await authorize(can.editSchedule);
  const edit = await readBody(req, matchEditSchema);
  const result = await editMatch(seasonId, matchId, edit, await viewer.actor());
  if (result !== "ok") throw REFUSALS[result];
  return noContent();
});

const DELETE_REFUSALS: Record<Exclude<DeleteResult, "ok">, ApiError> = {
  "not-found": new ApiError("not-found", "No such game this season."),
  scored: new ApiError("conflict", "A scored game can't be deleted; undo the score first."),
  "in-bracket": new ApiError("conflict", "This game is part of a bracket; delete the bracket instead."),
};

/** Deletes an unscored game outside a bracket, with its roster and score reports (supervisors; audit-logged). */
export const DELETE = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await authorize(can.editSchedule);
  const result = await deleteMatch(seasonId, matchId, await viewer.actor());
  if (result !== "ok") throw DELETE_REFUSALS[result];
  return noContent();
});
