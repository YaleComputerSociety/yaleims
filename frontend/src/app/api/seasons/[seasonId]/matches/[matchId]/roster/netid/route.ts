import { ApiError } from "@/lib/api/core";
import { netidAddSchema, type NetidAddResult } from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";
import { authorize, can, requireViewer } from "@/server/auth";
import { getMatch } from "@/server/data/matches";
import { created, readBody, route } from "@/server/http";
import { addByNetid } from "@/server/services/roster";

type Params = { seasonId: string; matchId: string };

/**
 * Puts someone on a side of the game by NetID (U10): their account, or the
 * person Yalies knows (an account is made for them), or an unverified NetID
 * matched later. The side's captain (until the start) or a supervisor.
 */
export const POST = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  await requireViewer();
  const { netid, collegeId, name } = await readBody(req, netidAddSchema);
  const match = await getMatch(seasonId, matchId);
  if (!match) throw new ApiError("not-found", "No such game this season.");
  if (!match.collegeIds.includes(collegeId)) throw new ApiError("conflict", "That college doesn't play in this game.");
  const viewer = await authorize(can.manageRoster, collegeId, match.sportId);
  const by = { supervisor: await can.takeAttendance(viewer), actor: await viewer.actor() };

  const result = await addByNetid(seasonId, matchId, collegeId, netid, name, by);
  switch (result.status) {
    case "added":
      return created({ playerId: result.playerId, verified: result.verified } satisfies NetidAddResult);
    case "other-college":
      throw new ApiError(
        "conflict",
        result.collegeId
          ? `${netid} is in ${collegeName(result.collegeId)} in the Yale directory, not ${collegeName(collegeId)}.`
          : `${netid} plays for another college this season.`
      );
    case "started":
      throw new ApiError("conflict", "The game has started: only a supervisor can change its roster now.");
    default:
      throw new ApiError("not-found", "No such game this season.");
  }
});
