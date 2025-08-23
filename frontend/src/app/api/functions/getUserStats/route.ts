import { NextResponse } from "next/server";
import { db } from "../../../../../lib/firebase"; 
import { getDoc, doc } from "firebase/firestore";

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
    const userSeasonRef = doc(db, "users", email, "seasons", seasonId);
    const snap = await getDoc(userSeasonRef);
    
    const userData = snap.data();

    return NextResponse.json(userData, { status: 200 });
  } catch (err) {
    console.error("Error in getting sports for captain:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
