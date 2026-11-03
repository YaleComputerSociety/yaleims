import { ApiError } from "@/lib/api/core";
import { matchEditSchema } from "@/lib/api/matches";
import { authorize, can } from "@/server/auth";
import { noContent, readBody, route } from "@/server/http";
import { editMatch, type EditResult } from "@/server/services/schedule";

type Params = { seasonId: string; matchId: string };

const REFUSALS: Record<Exclude<EditResult, "ok">, ApiError> = {
  "not-found": new ApiError("not-found", "No such game this season."),
  scored: new ApiError("conflict", "A scored game's colleges and sport can't change; undo the score first."),
  "unknown-sport": new ApiError("bad-request", "No such sport this season."),
  "unknown-college": new ApiError("bad-request", "Unknown college."),
  "bad-time": new ApiError("bad-request", "Invalid start time."),
};

/** Changes a game's colleges, sport, venue or start (admin or dev; audit-logged). */
export const PATCH = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await authorize(can.editSchedule);
  const edit = await readBody(req, matchEditSchema);
  const result = await editMatch(seasonId, matchId, edit, await viewer.actor());
  if (result !== "ok") throw REFUSALS[result];
  return noContent();
});
