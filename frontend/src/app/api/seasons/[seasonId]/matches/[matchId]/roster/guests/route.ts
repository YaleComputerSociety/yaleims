import { ApiError } from "@/lib/api/core";
import { guestSchema } from "@/lib/api/roster";
import { authorize, can } from "@/server/auth";
import { created, readBody, route } from "@/server/http";
import { addGuest } from "@/server/services/roster";

type Params = { seasonId: string; matchId: string };

/** Adds someone without an account as a guest player of a side, present at the game (supervisors). */
export const POST = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await authorize(can.takeAttendance);
  const { name, collegeId } = await readBody(req, guestSchema);
  const result = await addGuest(seasonId, matchId, collegeId, name, { supervisor: true, actor: await viewer.actor() });
  if (result.status !== "ok") {
    throw result.status === "no-match"
      ? new ApiError("not-found", "No such game this season.")
      : new ApiError("conflict", "That college doesn't play in this game.");
  }
  return created({ playerId: result.playerId });
});
