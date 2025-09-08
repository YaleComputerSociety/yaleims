import { NextResponse } from "next/server";
import { db } from "../../../../../lib/firebase"; 
import { getDoc, doc } from "firebase/firestore";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    console.log(email)
    if (!email) {
      return NextResponse.json(
        { error: "Missing required query param: email" },
        { status: 400 }
      );
    }
    const userRef = doc(db, "users", email);
    const snap = await getDoc(userRef);
    
    if (!snap.exists) {
      return NextResponse.json(
        { error: `User ${email} not found` },
        { status: 404 }
      );
    }
    
    const userData = snap.data();
    const sportsCaptainOf = Array.isArray(userData?.sportsCaptainOf)
      ? userData.sportsCaptainOf
      : [];

    // Optional: enforce that they are actually a captain
    if (!userData?.mRoles.includes("captain")) {
      return NextResponse.json(
        {
          error: `User ${email} is not a captain`,
          sportsCaptainOf: [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json(sportsCaptainOf, { status: 200 });
  } catch (err) {
    console.error("Error in getting sports for captain:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
