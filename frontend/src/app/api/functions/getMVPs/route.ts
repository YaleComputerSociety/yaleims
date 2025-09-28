import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "../../../../../lib/firebase"; 
import { getDoc, doc, getDocs, collection } from "firebase/firestore";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    const collegeId = searchParams.get("collegeId");
    if (!collegeId) {
      return NextResponse.json(
        { error: "Missing required query param: collegeId" },
        { status: 400 }
      );
    }

    if (!seasonId) {
      return NextResponse.json(
        { error: "Missing required query param: seasonId" },
        { status: 400 }
      );
    }

    const collegeColl = collection(db, "mvps", seasonId, collegeId);
    const snap = await getDocs(collegeColl);

    if (snap.empty) {
    return NextResponse.json({});
    }

    const data: Record<string, unknown> = {};
    snap.forEach((docSnap) => {
    data[docSnap.id] = docSnap.data(); 
    });

    return NextResponse.json(data);

  } catch (err) {
    console.error("Error in getMvps:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
