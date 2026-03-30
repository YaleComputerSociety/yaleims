import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { db } from "../../../../../lib/firebase";
import {
  doc,
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

export interface ScoreReport {
  id: string;
  reason: string;
  reportedBy: string;
  reportedByEmail: string;
  reportedAt: { _seconds: number; _nanoseconds?: number } | string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: { _seconds: number; _nanoseconds?: number } | string;
  matchId: string;
  season: string;
  matchHomeCollege?: string;
  matchAwayCollege?: string;
  homeScore?: number;
  awayScore?: number;
  sport?: string;
}

function formatReport(
  docSnap: { id: string; data: () => Record<string, unknown> },
  matchId: string,
  season: string
): ScoreReport {
  const d = docSnap.data();
  const reportedAt = d.reportedAt as
    | { _seconds: number; _nanoseconds?: number }
    | { seconds: number; nanoseconds?: number }
    | null;
  const resolvedAt = d.resolvedAt as
    | { _seconds: number; _nanoseconds?: number }
    | { seconds: number; nanoseconds?: number }
    | null;

  return {
    id: docSnap.id,
    reason: (d.reason as string) ?? "",
    reportedBy: (d.reportedBy as string) ?? "",
    reportedByEmail: (d.reportedByEmail as string) ?? "",
    reportedAt: reportedAt
      ? "_seconds" in reportedAt
        ? reportedAt
        : { _seconds: reportedAt.seconds, _nanoseconds: reportedAt.nanoseconds }
      : "",
    resolved: (d.resolved as boolean) ?? false,
    resolvedBy: d.resolvedBy as string | undefined,
    resolvedAt: resolvedAt
      ? "_seconds" in resolvedAt
        ? resolvedAt
        : { _seconds: resolvedAt.seconds, _nanoseconds: resolvedAt.nanoseconds }
      : undefined,
    matchId,
    season,
    matchHomeCollege: d.matchHomeCollege as string | undefined,
    matchAwayCollege: d.matchAwayCollege as string | undefined,
    homeScore: d.homeScore as number | undefined,
    awayScore: d.awayScore as number | undefined,
    sport: d.sport as string | undefined,
  };
}

/** GET reports: ?season=2025-2026&matchId=123 (for a match) or ?season=2025-2026&all=true (admin, all reports) */
export async function GET(req: Request): Promise<NextResponse> {
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

    const seasonStr = String(season);
    const scoreReportsRoot = doc(db, "matches", "score_reports");
    const seasonCol = collection(scoreReportsRoot, seasonStr);

    if (all) {
      const isAdmin = user.mRoles?.includes("admin") || user.mRoles?.includes("dev");
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden: admin required" }, { status: 403 });
      }

      const q = query(
        collectionGroup(db, "reports"),
        orderBy("reportedAt", "desc")
      );
      const snap = await getDocs(q);

      const allReports: ScoreReport[] = [];
      for (const docSnap of snap.docs) {
        const pathParts = docSnap.ref.path.split("/");
        const seasonFromPath = pathParts[2] ?? "";
        if (seasonFromPath !== seasonStr) continue;
        const mId = (docSnap.data().matchId as string) ?? pathParts[3] ?? "";
        allReports.push(formatReport(docSnap, mId, seasonStr));
      }

      return NextResponse.json({ reports: allReports }, { status: 200 });
    }

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing matchId for match-specific query" },
        { status: 400 }
      );
    }

    const matchDocRef = doc(seasonCol, String(matchId));
    const reportsCol = collection(matchDocRef, "reports");
    const q = query(reportsCol, orderBy("reportedAt", "desc"));
    const snap = await getDocs(q);

    const reports: ScoreReport[] = snap.docs.map((docSnap) =>
      formatReport(docSnap, String(matchId), seasonStr)
    );

    return NextResponse.json({ reports }, { status: 200 });
  } catch (err) {
    console.error("Error fetching score reports:", err);
    return NextResponse.json(
      { error: "Failed to fetch score reports" },
      { status: 500 }
    );
  }
}
