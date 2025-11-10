import { cookies } from "next/headers";
import { db } from "../../../../../lib/firebase";
import { doc, getDoc } from "@firebase/firestore";
import { Match } from "@src/types/components";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
    });
  }
  const url = new URL(req.url);
  const seasonId = url.searchParams.get("seasonId") ?? "2025-2026";
  const response = await fetch(
    `https://getusermatches-65477nrg6a-uc.a.run.app?seasonId=${seasonId}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
    }
  );

  if (!response.ok) {
    return new Response(await response.text(), { status: response.status });
  }

  const matches = await response.json();

  // Map to promises that fetch each match doc. Ensure we pass a string path
  // to `doc()` and coerce `match.id` to string — the Firestore helper expects
  // path segments as strings (or a single string path). Using a single path
  // string avoids ambiguity with alternating collection/doc segments.
  const dataPromises = matches.map(async (match: any) => {
    const matchId = String(match.id);
    const path = `matches/seasons/${seasonId}/${matchId}`;
    const matchRef = doc(db, path);
    const matchSnapshot = await getDoc(matchRef);
    const matchData = matchSnapshot.exists() ? matchSnapshot.data() : null;

    // Convert Firestore timestamp objects to ISO timestamp strings so the
    // frontend receives a predictable string instead of a Timestamp-like
    // object. Support multiple shapes: { seconds, nanoseconds },
    // { _seconds, _nanoseconds }, or a Firestore Timestamp with toDate().
    if (matchData && matchData.timestamp != null) {
      const ts = matchData.timestamp as any;
      // Prefer explicit numeric seconds fields
      const seconds =
        typeof ts.seconds === "number"
          ? ts.seconds
          : typeof ts._seconds === "number"
          ? ts._seconds
          : undefined;

      if (typeof seconds === "number") {
        matchData.timestamp = new Date(seconds * 1000).toISOString();
      } else if (typeof ts.toDate === "function") {
        // Firestore Timestamp instance
        try {
          matchData.timestamp = ts.toDate().toISOString();
        } catch (e) {
          // leave timestamp as-is if conversion fails
        }
      }
    }

    return matchData;
  });

  // Wait for all fetches to complete and return the resolved array
  const data = await Promise.all(dataPromises);
  return Response.json(data);
}
