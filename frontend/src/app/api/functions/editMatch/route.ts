import { getYearFromTimestamp } from "@src/utils/helpers";
import { db } from "../../../../../lib/firebase";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import { userTokenHasRoles } from "@src/utils/auth-helpers";

export async function PATCH(req: Request) {
  try {
    const hasRoles = await userTokenHasRoles(["admin", "dev"]);

    if (!hasRoles) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 403,
      });
    }

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

    // convert timestamp to Firestore Timestamp
    if (fields.timestamp) {
      fields.timestamp = Timestamp.fromDate(new Date(fields.timestamp));
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
