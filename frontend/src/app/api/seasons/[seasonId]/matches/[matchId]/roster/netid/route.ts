import { ApiError } from "@/lib/api/core";
import { netidAddSchema, type NetidAddResult } from "@/lib/api/roster";
import { authorize, can, requireViewer } from "@/server/auth";
import { getMatch } from "@/server/data/matches";
import { created, readBody, route } from "@/server/http";
import { addToGame, throwIfRefused } from "@/server/services/roster";

type Params = { seasonId: string; matchId: string };

/**
 * Puts someone on a side of the game by NetID (U10): their account, or one
 * made for them (unclaimed until they sign in), with the college the
 * directory gives; someone unassigned on this side, for this game only.
 * The side's captain (until the start) or a supervisor.
 */
export const POST = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  await requireViewer();
  const { netid, collegeId, name } = await readBody(req, netidAddSchema);
  const match = await getMatch(seasonId, matchId);
  if (!match) throw new ApiError("not-found", "No such game this season.");
  const viewer = await authorize(can.manageRoster, collegeId, match.sportId);
  const result = throwIfRefused(await addToGame(seasonId, matchId, collegeId, { netid, name }, await viewer.actor()));
  return created({ playerId: result.playerId, verified: result.verified } satisfies NetidAddResult);
});
