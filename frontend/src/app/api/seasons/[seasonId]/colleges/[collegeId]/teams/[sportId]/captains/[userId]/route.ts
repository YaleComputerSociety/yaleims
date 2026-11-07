import { ApiError } from "@/lib/api/core";
import { authorize, can, requireCurrentSeason } from "@/server/auth";
import { noContent, route } from "@/server/http";
import { setCaptain } from "@/server/services/roles";

type Params = { seasonId: string; collegeId: string; sportId: string; userId: string };

/** PUT makes the college's player captain of its team in the sport; DELETE, not (idempotent). */
async function changeCaptain(params: Promise<Params>, assign: boolean): Promise<Response> {
  const { seasonId, collegeId, sportId, userId } = await params;
  const viewer = await authorize(can.manageCaptains, collegeId);
  await requireCurrentSeason(seasonId);
  const result = await setCaptain(seasonId, collegeId, sportId, userId, assign, await viewer.actor());
  if (result === "unknown-sport") throw new ApiError("not-found", "No such sport this season.");
  if (result === "not-in-season") throw new ApiError("not-found", "They aren't a player this season.");
  if (result === "other-college") throw new ApiError("bad-request", "They aren't a player of this college.");
  return noContent();
}

/** The college's rep or an admin/dev, current season (D42); audit-logged. */
export const PUT = route<Params>((req, { params }) => changeCaptain(params, true));
export const DELETE = route<Params>((req, { params }) => changeCaptain(params, false));
