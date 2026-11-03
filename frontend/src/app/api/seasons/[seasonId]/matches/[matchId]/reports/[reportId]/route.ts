import { ApiError } from "@/lib/api/core";
import { reportChangeSchema } from "@/lib/api/reports";
import { authorize, can } from "@/server/auth";
import { resolveScoreReport } from "@/server/data/scoreReports";
import { noContent, readBody, route } from "@/server/http";

type Params = { seasonId: string; matchId: string; reportId: string };

/** Marks a report resolved (supervisors; audit-logged). */
export const PATCH = route<Params>(async (req, { params }) => {
  const { seasonId, matchId, reportId } = await params;
  const viewer = await authorize(can.score);
  await readBody(req, reportChangeSchema);
  if (!(await resolveScoreReport(seasonId, matchId, reportId, await viewer.actor()))) {
    throw new ApiError("not-found", "No such report.");
  }
  return noContent();
});
