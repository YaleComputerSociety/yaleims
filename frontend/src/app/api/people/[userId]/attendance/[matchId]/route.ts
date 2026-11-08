import { ApiError } from "@/lib/api/core";
import { attendanceFixSchema } from "@/lib/api/people";
import { authorize, can } from "@/server/auth";
import { noContent, readBody, route } from "@/server/http";
import { fixAttendance, type AttendanceFixResult } from "@/server/services/people";

type Params = { userId: string; matchId: string };

const REFUSALS: Record<Exclude<AttendanceFixResult, "ok">, ApiError> = {
  "not-found": new ApiError("not-found", "They aren't on this game."),
  "no-target": new ApiError("not-found", "No account has that NetID (or two do). Add them from the game's sheet instead."),
  "target-on-game": new ApiError("conflict", "That person is already on this game: remove this entry instead."),
};

/** Confirms (or takes back) attendance under review, removes the entry, or moves it to the right person by NetID (admins; audit-logged). */
export const PATCH = route<Params>(async (req, { params }) => {
  const { userId, matchId } = await params;
  const viewer = await authorize(can.managePeople);
  const fix = await readBody(req, attendanceFixSchema);
  const result = await fixAttendance(userId, matchId, fix, await viewer.actor());
  if (result !== "ok") throw REFUSALS[result];
  return noContent();
});
