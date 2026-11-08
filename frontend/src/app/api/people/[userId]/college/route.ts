import { ApiError } from "@/lib/api/core";
import { collegeFixSchema } from "@/lib/api/people";
import { authorize, can } from "@/server/auth";
import { noContent, readBody, route } from "@/server/http";
import { setPlayerCollege } from "@/server/services/affiliation";

type Params = { userId: string };

/**
 * Sets the person's college in a season, or clears it (admins, decision 4c):
 * the old college's captaincies and rep role end and its upcoming sign-ups
 * are withdrawn in the same step; audit-logged with the reason.
 */
export const PUT = route<Params>(async (req, { params }) => {
  const { userId } = await params;
  const viewer = await authorize(can.managePeople);
  const { seasonId, collegeId, reason, revision } = await readBody(req, collegeFixSchema);
  const result = await setPlayerCollege(seasonId, userId, collegeId, reason, await viewer.actor(), revision);
  if (result === "no-user") throw new ApiError("not-found", "No such user.");
  if (result === "unknown-college") throw new ApiError("bad-request", "No such college this season.");
  return noContent();
});
