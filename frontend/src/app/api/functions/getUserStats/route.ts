import { NextResponse } from "next/server";
import { getUserSeason } from "@/server/data/users";

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

    // Only games played; the user-season doc still holds frozen betting fields.
    const userSeason = await getUserSeason(email, seasonId);
    return NextResponse.json(
      { matches: userSeason?.matches ?? [] },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error getting user stats:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
