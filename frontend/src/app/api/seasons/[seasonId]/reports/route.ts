import { toJson } from "@/lib/api/core";
import { toMatch } from "@/lib/api/matches";
import { seasonReportsQuerySchema, type ScoreReportList, type SeasonScoreReport } from "@/lib/api/reports";
import { authorize, can } from "@/server/auth";
import { getMatches } from "@/server/data/matches";
import { listSeasonScoreReports } from "@/server/data/scoreReports";
import { displayName, getUsers, identityOf } from "@/server/data/users";
import { ok, readQuery, route } from "@/server/http";

type Params = { seasonId: string };

/** The season's score reports, newest first, with each game, the reporter's identity (emails for admins) and the resolver's name (supervisors). */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId } = await params;
  const viewer = await authorize(can.score);
  const { status } = readQuery(req, seasonReportsQuerySchema);
  const reports = (await listSeasonScoreReports(seasonId)).filter((r) => !status || r.status === status);
  const [matches, users, withEmail] = await Promise.all([
    getMatches(seasonId, [...new Set(reports.map((r) => r.matchId))]),
    getUsers(reports.flatMap((r) => [r.reportedBy, ...(r.resolvedBy ? [r.resolvedBy] : [])])),
    can.seeEmails(viewer),
  ]);
  const items = reports.map((report): SeasonScoreReport => {
    const match = matches.get(report.matchId);
    const resolver = report.resolvedBy ? users.get(report.resolvedBy) : undefined;
    return {
      ...toJson(report),
      match: match ? toMatch({ id: report.matchId, ...match }) : null,
      reporter: identityOf(users.get(report.reportedBy), report.reporterName, withEmail),
      resolverName: resolver ? displayName(resolver) : null,
    };
  });
  return ok({ items, total: items.length } satisfies ScoreReportList<SeasonScoreReport>);
});
