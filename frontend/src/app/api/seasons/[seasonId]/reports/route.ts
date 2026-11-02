import { toJson } from "@/lib/api/core";
import { toMatch } from "@/lib/api/matches";
import { seasonReportsQuerySchema, type ScoreReportList, type SeasonScoreReport } from "@/lib/api/reports";
import { authorize, can } from "@/server/auth";
import { getMatches } from "@/server/data/matches";
import { listSeasonScoreReports } from "@/server/data/scoreReports";
import { getUserNames } from "@/server/data/users";
import { ok, readQuery, route } from "@/server/http";

type Params = { seasonId: string };

/** The season's score reports, newest first, with each game and the resolver's name (admin or dev). */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId } = await params;
  await authorize(can.score);
  const { status } = readQuery(req, seasonReportsQuerySchema);
  const reports = (await listSeasonScoreReports(seasonId)).filter((r) => !status || r.status === status);
  const [matches, resolvers] = await Promise.all([
    getMatches(seasonId, [...new Set(reports.map((r) => r.matchId))]),
    getUserNames(reports.flatMap((r) => (r.resolvedBy ? [r.resolvedBy] : []))),
  ]);
  const items = reports.map((report): SeasonScoreReport => {
    const match = matches.get(report.matchId);
    return {
      ...toJson(report),
      match: match ? toMatch({ id: report.matchId, ...match }) : null,
      resolverName: (report.resolvedBy && resolvers.get(report.resolvedBy)) || null,
    };
  });
  return ok({ items, total: items.length } satisfies ScoreReportList<SeasonScoreReport>);
});
