import { NextResponse } from "next/server";
import { db } from "../../../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

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

    const usersRef = collection(db, "users");

    const [captainSnap, repSnap] = await Promise.all([
      getDocs(query(usersRef, where("college", "==", college), where("mRoles", "array-contains-any", ["captain"]))),
      getDocs(query(usersRef, where("college", "==", college), where("mRoles", "array-contains-any", ["college_rep"]))),
    ]);

    const toUser = (d: any) => {
      const u = d.data();
      return {
        email: u.email ?? d.id,
        firstName: u.firstname ?? u.firstName ?? "",
        lastName: u.lastname ?? u.lastName ?? "",
        college: u.college ?? college,
        sportsCaptainOf: u.sportsCaptainOf ?? [],
      };
    };

    const captains = captainSnap.docs.map(toUser);
    const college_rep = repSnap.docs.map(toUser).map(u => {
      // reps may not need sports list; remove if you want these slimmer:
      const { sportsCaptainOf, ...rest } = u; return rest;
    });

    return NextResponse.json({ captains, college_rep });
  } catch (err) {
    console.error("Error in getCollegeCaptains:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
