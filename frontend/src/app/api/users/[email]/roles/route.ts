import { ApiError } from "@/lib/api/core";
import { userRolesSchema } from "@/lib/api/users";
import { authorize, can } from "@/server/auth";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { noContent, readBody, route } from "@/server/http";
import { setUserRoles, type Refusal } from "@/server/services/roles";

type Params = { email: string };

const REFUSALS: Record<Refusal, ApiError> = {
  "no-user": new ApiError("not-found", "No such user."),
  "not-in-season": new ApiError("conflict", "They haven't joined this season yet (they join at their next login)."),
  "no-college": new ApiError("conflict", "They have no college this season."),
  "unknown-sport": new ApiError("bad-request", "No such sport this season."),
};

/** Sets every role a user holds, season roles and captaincies in the current season (devs; audit-logged). */
export const PUT = route<Params>(async (req, { params }) => {
  const { email } = await params;
  const viewer = await authorize(can.manageRoles);
  const { roles, captainOf } = await readBody(req, userRolesSchema);
  const seasonId = await getCurrentSeasonId();
  if (!seasonId) throw new Error("config/app has no current season");
  const result = await setUserRoles(seasonId, email, roles, captainOf, await viewer.actor());
  if (result !== "ok") throw REFUSALS[result];
  return noContent();
});
