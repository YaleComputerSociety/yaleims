import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { adminDb } from "../../../../../lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

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
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    let user: { name?: string; username?: string; email: string; mRoles?: string[] };
    try {
      user = jwt.verify(token.value, JWT_SECRET) as typeof user;
    } catch {
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

    const matchIdStr = String(matchId);
    const seasonStr = String(season);

    const reportsCol = adminDb
      .collection("matches")
      .doc("score_reports")
      .collection(seasonStr)
      .doc(matchIdStr)
      .collection("reports");

    const reportData = {
      reason: reason.trim(),
      reportedBy: user.name || user.username || "Unknown",
      reportedByEmail: user.email,
      reportedAt: FieldValue.serverTimestamp(),
      resolved: false,
      season: seasonStr,
      matchId: matchIdStr,
      matchHomeCollege: matchHomeCollege ?? null,
      matchAwayCollege: matchAwayCollege ?? null,
      homeScore: homeScore ?? null,
      awayScore: awayScore ?? null,
      sport: sport ?? null,
    };

    const docRef = await reportsCol.add(reportData);

    return NextResponse.json(
      {
        success: true,
        reportId: docRef.id,
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
