import { newReportSchema, toMatchScoreReport, type MatchScoreReport, type ScoreReportList } from "@/lib/api/reports";
import { can, requireViewer } from "@/server/auth";
import { addScoreReport, listMatchScoreReports } from "@/server/data/scoreReports";
import { displayName, getUsers, identityOf } from "@/server/data/users";
import { created, ok, readBody, route } from "@/server/http";

type Params = { seasonId: string; matchId: string };

/**
 * The game's score reports, newest first, with the resolver's name (signed
 * in; who reported and resolved it, by user id and the reporter's identity,
 * for supervisors only; emails for admins).
 */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await requireViewer();
  const [reports, withIds, withEmail] = await Promise.all([listMatchScoreReports(seasonId, matchId), can.score(viewer), can.seeEmails(viewer)]);
  const users = await getUsers(reports.flatMap((r) => [r.reportedBy, ...(r.resolvedBy ? [r.resolvedBy] : [])]));
  return ok({
    items: reports.map((r) => {
      const resolver = r.resolvedBy ? users.get(r.resolvedBy) : undefined;
      const reporter = withIds ? identityOf(users.get(r.reportedBy), r.reporterName, withEmail) : null;
      return toMatchScoreReport(r, resolver ? displayName(resolver) : null, reporter);
    }),
    total: reports.length,
  } satisfies ScoreReportList<MatchScoreReport>);
});

/** Flags the game's score as wrong (signed in), with the score it has now. */
export const POST = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await requireViewer();
  const { reason } = await readBody(req, newReportSchema);
  const id = await addScoreReport(seasonId, matchId, {
    reason,
    reportedBy: viewer.userId,
    reporterName: (await viewer.name()) || "Unknown",
  });
  return created({ id });
});
