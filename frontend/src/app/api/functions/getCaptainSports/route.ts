import { NextResponse } from "next/server";
import { getUser } from "@/server/data/users";
import type { CaptainSportsResponse } from "@/types/api";

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

    const user = await getUser(email);
    if (!user?.mRoles?.includes("captain")) {
      return NextResponse.json(
        {
          error: `User ${email} is not a captain`,
          sportsCaptainOf: [],
        } satisfies CaptainSportsResponse,
        { status: 200 }
      );
    }

    return NextResponse.json(
      (Array.isArray(user.sportsCaptainOf)
        ? user.sportsCaptainOf
        : []) satisfies CaptainSportsResponse,
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in getting sports for captain:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
