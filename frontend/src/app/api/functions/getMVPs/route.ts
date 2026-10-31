import { NextResponse } from "next/server";
import { collegeIdOfName } from "@/lib/colleges";
import { getSessionToken } from "@/server/session";
import { listColleges } from "@/server/data/colleges";
import { listCollegeMvps } from "@/server/data/mvps";
import type { MvpsResponse } from "@/types/api";

/**
 * ?seasonId&collegeId (a college name or id): the college's MVPs that
 * season, in the pre-v3 shape: { week_N: { email: { fname, lname } } }.
 */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    // Requires a session cookie but doesn't verify it (unchanged; the data is
    // publicly readable anyway).
    if (!(await getSessionToken())) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    const college = searchParams.get("collegeId");
    if (!college) {
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

    const collegeId = collegeIdOfName(await listColleges(seasonId), college);
    const awards = collegeId ? await listCollegeMvps(seasonId, collegeId) : [];
    const mvps: MvpsResponse = {};
    for (const a of awards) {
      const weekId = `week_${a.week}`;
      const [fname, ...rest] = a.name.split(" ");
      mvps[weekId] = { ...mvps[weekId], [a.playerId]: { fname, lname: rest.join(" ") } };
    }
    return NextResponse.json(mvps);
  } catch (err) {
    console.error("Error in getMvps:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
