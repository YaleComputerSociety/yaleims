import { NextResponse } from "next/server";
import { getSessionToken } from "@/server/session";
import { listCollegeMvps } from "@/server/data/mvps";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    // Requires a session cookie but doesn't verify it (unchanged; the data is
    // publicly readable anyway).
    if (!(await getSessionToken())) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    const collegeId = searchParams.get("collegeId");
    if (!collegeId) {
      return NextResponse.json(
        { error: "Missing required query param: collegeId" },
        { status: 400 }
      );
    }
    if (!seasonId) {
      return NextResponse.json(
        { error: "Missing required query param: seasonId" },
        { status: 400 }
      );
    }

    return NextResponse.json(await listCollegeMvps(seasonId, collegeId));
  } catch (err) {
    console.error("Error in getMvps:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
