import { getYearFromTimestamp } from "@src/utils/helpers";
import { db } from "../../../../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { cookies } from "next/headers";

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    if (!token) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }

    // TODO: check that user is admin? I'm not sure how our security is working right now

    const matchData = await req.json();
    const { id, ...fields } = matchData;

    const matchId = String(id);

    if (typeof matchId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid matchId" }), {
        status: 400,
      });
    }

    const year = getYearFromTimestamp(fields.timestamp);

    if (!matchId) {
      return new Response(JSON.stringify({ error: "Missing matchId" }), {
        status: 400,
      });
    }

    if (!year) {
      return new Response(JSON.stringify({ error: "Error calculating year" }), {
        status: 400,
      });
    }

    // Update the match document in Firestore
    const matchRef = doc(db, "matches", "seasons", year, matchId);
    await updateDoc(matchRef, fields);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
