import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { db } from "../../../../../lib/firebase";
import {
  doc,
  collection,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

/** POST: resolve a score report. Body: { reportId, matchId, season }. Admin only. */
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

    const isAdmin = user.mRoles?.includes("admin") || user.mRoles?.includes("dev");
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

    const scoreReportsRoot = doc(db, "matches", "score_reports");
    const seasonCol = collection(scoreReportsRoot, String(season));
    const matchDocRef = doc(seasonCol, String(matchId));
    const reportsCol = collection(matchDocRef, "reports");
    const reportDocRef = doc(reportsCol, String(reportId));

    await updateDoc(reportDocRef, {
      resolved: true,
      resolvedBy: user.name || user.username || user.email,
      resolvedAt: serverTimestamp(),
    });

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
