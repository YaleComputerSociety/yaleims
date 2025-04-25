import { collection, getDocs, doc, getDoc, query, orderBy, updateDoc, increment } from "firebase/firestore";
import {db} from "../../../../../lib/firebase";
import { NextResponse } from "next/server";

async function apiKeyExists(apiKey: string) {
  const userApiRef = collection(db, 'user_api_keys');
  const ref = doc(userApiRef, apiKey);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      uses: increment(1)})
    return true;
  }
  return false;    
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({message: "No token provided."}, { status: 401 });
    }

    const apiKey = authHeader.split("Bearer ")[1];
    if (!apiKey) {
      return NextResponse.json({message: "No API key provided."}, { status: 401 });
    }
    if (!await apiKeyExists(apiKey)) {
      return NextResponse.json({message: "Invalid API key."}, { status: 401 });
    }

    const leaderboardRef = collection(db, 'colleges');

    const leaderboardQuery = query(
      leaderboardRef,
      orderBy("points", "desc"),
      orderBy("wins", "desc")
    );
    const snapshot = await getDocs(leaderboardQuery);

    if (snapshot.empty) {
      return NextResponse.json({message: "No colleges found."}, { status: 404 });
    }

    const leaderboard = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.get('name'),
      games: doc.get('games'),
      wins: doc.get('wins'),
      rank: doc.get('rank'),
      forfeits: doc.get('forfeits'),
      losses: doc.get('losses'),
      ties: doc.get('ties'),
      points: doc.get('points'),
    }));

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({message: "Error fetching leaderboard."}, { status: 500 });
  }
}