import { ApiError } from "@/lib/api/core";
import { newReportSchema, toMatchScoreReport, type MatchScoreReport, type ScoreReportList } from "@/lib/api/reports";
import { can, requireViewer } from "@/server/auth";
import { getMatch } from "@/server/data/matches";
import { addScoreReport, listMatchScoreReports } from "@/server/data/scoreReports";
import { getUserNames } from "@/server/data/users";
import { created, ok, readBody, route } from "@/server/http";

type Params = { seasonId: string; matchId: string };

/**
 * The game's score reports, newest first, with the resolver's name (signed
 * in; the emails for admins and devs only).
 */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await requireViewer();
  const [reports, withEmails] = await Promise.all([listMatchScoreReports(seasonId, matchId), can.score(viewer)]);
  const resolvers = await getUserNames(reports.flatMap((r) => (r.resolvedBy ? [r.resolvedBy] : [])));
  return ok({
    items: reports.map((r) => toMatchScoreReport(r, withEmails, (r.resolvedBy && resolvers.get(r.resolvedBy)) || null)),
    total: reports.length,
  } satisfies ScoreReportList<MatchScoreReport>);
});

/** Flags the game's score as wrong (signed in), with the score it has now. */
export const POST = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await requireViewer();
  const { reason } = await readBody(req, newReportSchema);
  const match = await getMatch(seasonId, matchId);
  if (!match) throw new ApiError("not-found", "No such game this season.");
  const id = await addScoreReport(seasonId, matchId, {
    reason,
    reportedBy: viewer.email,
    reporterName: viewer.name || (await viewer.user())?.username || "Unknown",
    scoreAtReport: { home: match.result?.homeScore ?? null, away: match.result?.awayScore ?? null },
  });
  return created({ id });
});
