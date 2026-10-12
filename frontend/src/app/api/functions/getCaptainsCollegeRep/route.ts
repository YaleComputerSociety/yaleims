import { NextResponse } from "next/server";
import { listCollegeUsersWithAnyRole } from "@/server/data/users";
import type { UserDoc, WithId } from "@/types/firestore";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const college = searchParams.get("college")?.trim();
    if (!college) {
      return NextResponse.json(
        { error: "Missing required query param: college" },
        { status: 400 }
      );
    }

    const [captainDocs, repDocs] = await Promise.all([
      listCollegeUsersWithAnyRole(college, ["captain"]),
      listCollegeUsersWithAnyRole(college, ["college_rep"]),
    ]);

    const contact = (u: WithId<UserDoc>) => ({
      email: u.email ?? u.id,
      firstName: u.firstname ?? "",
      lastName: u.lastname ?? "",
      college: u.college ?? college,
    });

    const captains = captainDocs.map((u) => ({
      ...contact(u),
      sportsCaptainOf: u.sportsCaptainOf ?? [],
    }));
    const college_rep = repDocs.map(contact);

    return NextResponse.json({ captains, college_rep });
  } catch (err) {
    console.error("Error in getCollegeCaptains:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
