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
    const {
      matchId,
      season,
      reason,
      matchHomeCollege,
      matchAwayCollege,
      homeScore,
      awayScore,
      sport,
    } = body;

    if (!matchId || !season || !reason?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: matchId, season, reason" },
        { status: 400 }
      );
    }

    const reportId = await addScoreReport(String(season), String(matchId), {
      reason: reason.trim(),
      reportedBy: user.name || user.username || "Unknown",
      reportedByEmail: user.email,
      matchHomeCollege: matchHomeCollege ?? null,
      matchAwayCollege: matchAwayCollege ?? null,
      homeScore: homeScore ?? null,
      awayScore: awayScore ?? null,
      sport: sport ?? null,
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
