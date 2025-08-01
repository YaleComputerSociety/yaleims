import { NextResponse } from "next/server";
import { db } from "../../../../../lib/firebase"; 
import { getDoc, doc } from "firebase/firestore";

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
    const matchDocRef = doc(
      db,
      "matches",
      "seasons",
      seasonId,
      matchId
    );
    const snap = await getDoc(matchDocRef);
    
    if (!snap.exists) {
      return NextResponse.json(
        { error: `Match with id ${matchId} not found` },
        { status: 404 }
      );
    }

    const matchData = snap.data();

    const participants = {
      home_college_participants:
        matchData?.home_college_participants || [],
      away_college_participants:
        matchData?.away_college_participants || [],
    };

    return NextResponse.json(participants);
  } catch (err) {
    console.error("Error in getMatchParticipants:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
