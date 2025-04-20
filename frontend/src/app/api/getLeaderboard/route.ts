import { collection, getDocs } from "firebase/firestore";
import {db} from "../../../../lib/firebase";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const leaderboardRef = collection(db, 'colleges');
    const snapshot = await getDocs(leaderboardRef);
    
    if (snapshot.empty) {
      return NextResponse.json({message: "No colleges found."}, { status: 404 });
    }

    const leaderboard = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({message: "Error fetching leaderboard."}, { status: 500 });
  }
}