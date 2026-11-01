import { NextResponse } from "next/server";
import { legacyMatchId } from "@/lib/legacyMatch";
import { listPlayerEntries } from "@/server/data/roster";
import type { UserStatsResponse } from "@/types/api";

/** ?email&seasonId: the games the user signed up for that season ({ id, timestamp }). */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const seasonId = searchParams.get("seasonId");

    if (!email || !seasonId) {
      return NextResponse.json(
        { error: "Missing required query params: email and seasonId" },
        { status: 400 }
      );
    }

    const matches = (await listPlayerEntries(seasonId, email))
      .filter((e) => e.captainStatus !== "removed")
      .map((e) => ({ id: legacyMatchId(e.matchId), timestamp: e.startsAt.toDate().toISOString() }));
    return NextResponse.json({ matches } satisfies UserStatsResponse, { status: 200 });
  } catch (err) {
    console.error("Error getting user stats:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
