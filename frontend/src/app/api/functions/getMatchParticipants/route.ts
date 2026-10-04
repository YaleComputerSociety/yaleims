import { NextResponse } from "next/server";
import { getMatch } from "@/server/data/matches";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");
    const seasonId = searchParams.get("seasonId");
    if (!matchId) {
      return NextResponse.json(
        { error: "Missing required query param: matchId" },
        { status: 400 }
      );
    }
    if (!seasonId) {
      return NextResponse.json(
        { error: "Missing required query param: seasonId" },
        { status: 400 }
      );
    }

    // An unknown match answers with no participants, not a 404 (as always).
    const match = await getMatch(seasonId, matchId);
    return NextResponse.json({
      home_college_participants: match?.home_college_participants || [],
      away_college_participants: match?.away_college_participants || [],
    });
  } catch (err) {
    console.error("Error in getMatchParticipants:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
