import { NextResponse } from "next/server";
import { getSession, hasAnyRole } from "@/server/session";
import { getMatches } from "@/server/data/matches";
import { listMatchScoreReports, listSeasonScoreReports } from "@/server/data/scoreReports";
import { listSports } from "@/server/data/sports";
import { getUsers } from "@/server/data/users";
import type { ScoreReport, ScoreReportsResponse, SerializedTimestamp } from "@/types/api";
import type { ScoreReportDoc, StoredTimestamp, WithId } from "@/types/firestore";

const apiTimestamp = (ts: StoredTimestamp | undefined | null): SerializedTimestamp | undefined =>
  ts ? { _seconds: ts.seconds, _nanoseconds: ts.nanoseconds } : undefined;

/**
 * Reports in the pre-v3 shape: with their game's colleges and sport (read
 * from the games) and the resolver's name when known.
 */
async function formatReports(season: string, reports: WithId<ScoreReportDoc>[]): Promise<ScoreReport[]> {
  const [games, sports, resolvers] = await Promise.all([
    getMatches(season, [...new Set(reports.map((r) => r.matchId))]),
    listSports(season),
    getUsers([...new Set(reports.flatMap((r) => (r.resolvedBy ? [r.resolvedBy] : [])))]),
  ]);
  return reports.map((r) => {
    const game = games.get(r.matchId);
    const resolver = r.resolvedBy ? resolvers.get(r.resolvedBy) : undefined;
    return {
      id: r.id,
      reason: r.reason,
      reportedBy: r.reporterName,
      reportedByEmail: r.reportedBy,
      reportedAt: apiTimestamp(r.reportedAt) ?? "",
      resolved: r.status === "resolved",
      resolvedBy: resolver ? `${resolver.firstname} ${resolver.lastname}` : (r.resolvedBy ?? undefined),
      resolvedAt: apiTimestamp(r.resolvedAt),
      matchId: r.matchId,
      season,
      matchHomeCollege: game?.homeCollegeId ?? null,
      matchAwayCollege: game?.awayCollegeId ?? null,
      homeScore: r.scoreAtReport.home,
      awayScore: r.scoreAtReport.away,
      sport: sports.find((s) => s.id === game?.sportId)?.name ?? null,
    };
  });
}

/** GET reports: ?season=<seasonId>&matchId=123 (for a match) or ?season=<seasonId>&all=true (admin, all reports) */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const season = searchParams.get("season");
    const matchId = searchParams.get("matchId");
    const all = searchParams.get("all") === "true";

    if (!season) {
      return NextResponse.json(
        { error: "Missing required query param: season" },
        { status: 400 }
      );
    }

    if (all) {
      if (!hasAnyRole(user, ["admin", "dev"])) {
        return NextResponse.json({ error: "Forbidden: admin required" }, { status: 403 });
      }
      const reports = await formatReports(season, await listSeasonScoreReports(season));
      return NextResponse.json({ reports } satisfies ScoreReportsResponse, { status: 200 });
    }

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing matchId for match-specific query" },
        { status: 400 }
      );
    }

    const reports = await formatReports(season, await listMatchScoreReports(season, matchId));
    return NextResponse.json({ reports } satisfies ScoreReportsResponse, { status: 200 });
  } catch (err) {
    console.error("Error fetching score reports:", err);
    return NextResponse.json(
      { error: "Failed to fetch score reports" },
      { status: 500 }
    );
  }
}
