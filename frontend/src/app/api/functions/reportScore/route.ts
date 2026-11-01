import { NextResponse } from "next/server";
import { getSession } from "@/server/session";
import { addScoreReport } from "@/server/data/scoreReports";

export interface ScoreReportPayload {
  matchId: string;
  season: string;
  reason: string;
  matchHomeCollege?: string;
  matchAwayCollege?: string;
  homeScore?: number;
  awayScore?: number;
  sport?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ScoreReportPayload = await req.json();
    const { matchId, season, reason, homeScore, awayScore } = body;

    if (!matchId || !season || !reason?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: matchId, season, reason" },
        { status: 400 }
      );
    }

    // The score the reporter saw; the game's other fields are on the game.
    const reportId = await addScoreReport(String(season), String(matchId), {
      reason: reason.trim(),
      reportedBy: user.email,
      reporterName: user.name || user.username || "Unknown",
      scoreAtReport: { home: homeScore ?? null, away: awayScore ?? null },
    });

    return NextResponse.json(
      {
        success: true,
        reportId,
        message: "Score report submitted successfully",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error submitting score report:", err);
    return NextResponse.json(
      { error: "Failed to submit score report" },
      { status: 500 }
    );
  }
}
