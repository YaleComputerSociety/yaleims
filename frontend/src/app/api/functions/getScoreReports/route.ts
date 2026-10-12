import { NextResponse } from "next/server";
import { getSession, hasAnyRole } from "@/server/session";
import {
  listMatchScoreReports,
  listSeasonScoreReports,
} from "@/server/data/scoreReports";
import type { ScoreReport, ScoreReportsResponse, SerializedTimestamp } from "@/types/api";
import type { ScoreReportDoc, StoredTimestamp, WithId } from "@/types/firestore";

const apiTimestamp = (ts: StoredTimestamp | undefined | null): SerializedTimestamp | undefined =>
  ts ? { _seconds: ts.seconds, _nanoseconds: ts.nanoseconds } : undefined;

function formatReport(
  d: WithId<ScoreReportDoc>,
  matchId: string,
  season: string
): ScoreReport {
  return {
    id: d.id,
    reason: d.reason ?? "",
    reportedBy: d.reportedBy ?? "",
    reportedByEmail: d.reportedByEmail ?? "",
    reportedAt: apiTimestamp(d.reportedAt) ?? "",
    resolved: d.resolved ?? false,
    resolvedBy: d.resolvedBy,
    resolvedAt: apiTimestamp(d.resolvedAt),
    matchId,
    season,
    matchHomeCollege: d.matchHomeCollege,
    matchAwayCollege: d.matchAwayCollege,
    homeScore: d.homeScore,
    awayScore: d.awayScore,
    sport: d.sport,
  };
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
      const reports = (await listSeasonScoreReports(season)).map((r) =>
        formatReport(r, r.matchId, season)
      );
      return NextResponse.json({ reports } satisfies ScoreReportsResponse, { status: 200 });
    }

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing matchId for match-specific query" },
        { status: 400 }
      );
    }

    const reports = (await listMatchScoreReports(season, matchId)).map((r) =>
      formatReport(r, matchId, season)
    );
    return NextResponse.json({ reports } satisfies ScoreReportsResponse, { status: 200 });
  } catch (err) {
    console.error("Error fetching score reports:", err);
    return NextResponse.json(
      { error: "Failed to fetch score reports" },
      { status: 500 }
    );
  }
}
