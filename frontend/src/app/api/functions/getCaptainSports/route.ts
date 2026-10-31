import { NextResponse } from "next/server";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { captainSportNames } from "@/server/services/roles";
import type { CaptainSportsResponse } from "@/types/api";

/** ?email=: the sports the user captains this season (an error object, status 200, if none). */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) {
      return NextResponse.json(
        { error: "Missing required query param: email" },
        { status: 400 }
      );
    }

    const seasonId = await getCurrentSeasonId();
    const sports = seasonId ? await captainSportNames(seasonId, email) : [];
    if (sports.length === 0) {
      return NextResponse.json(
        {
          error: `User ${email} is not a captain`,
          sportsCaptainOf: [],
        } satisfies CaptainSportsResponse,
        { status: 200 }
      );
    }
    return NextResponse.json(sports satisfies CaptainSportsResponse, { status: 200 });
  } catch (err) {
    console.error("Error in getting sports for captain:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
