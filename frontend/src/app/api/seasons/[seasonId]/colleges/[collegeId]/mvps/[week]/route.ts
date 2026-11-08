import { mvpAwardSchema, mvpParamsSchema } from "@/lib/api/colleges";
import { ApiError } from "@/lib/api/core";
import { authorize, can } from "@/server/auth";
import { setMvp } from "@/server/services/mvps";
import { noContent, readBody, readParams, route } from "@/server/http";

type Params = { seasonId: string; collegeId: string; week: string };

/**
 * Names one of the college's players that season an MVP of the week (the
 * college's rep, admins/devs; D42). Their name comes from their player doc.
 * Naming them again for the week changes nothing.
 */
export const PUT = route<Params>(async (req, { params }) => {
  const { seasonId, collegeId, week } = await readParams(params, mvpParamsSchema);
  const viewer = await authorize(can.nameMvps, collegeId);
  const { playerId } = await readBody(req, mvpAwardSchema);
  if (!(await setMvp(seasonId, collegeId, { week, playerId, awardedBy: viewer.userId }))) {
    throw new ApiError("bad-request", "They aren't a player of this college that season.");
  }
  return noContent();
});
