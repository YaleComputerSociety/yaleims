import { NextResponse } from "next/server";
import { getSession, hasAnyRole } from "@/server/session";
import { resolveScoreReport } from "@/server/data/scoreReports";

/** POST: resolve a score report. Body: { reportId, matchId, season }. Admin only. */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = hasAnyRole(user, ["admin", "dev"]);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: admin required" }, { status: 403 });
    }

    const body = await req.json();
    const { reportId, matchId, season } = body;

    if (!reportId || !matchId || !season) {
      return NextResponse.json(
        { error: "Missing required fields: reportId, matchId, season" },
        { status: 400 }
      );
    }

    await resolveScoreReport(
      String(season),
      String(matchId),
      String(reportId),
      user.name || user.username || user.email
    );

    return NextResponse.json(
      { success: true, message: "Report marked as resolved" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error resolving score report:", err);
    return NextResponse.json(
      { error: "Failed to resolve score report" },
      { status: 500 }
    );
  }
}
