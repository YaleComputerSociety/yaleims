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
    const { id, seasonId, ...fields } = matchData;

    const matchId = String(id);

    if (!matchId || matchId === "undefined" || matchId === "null") {
      return new Response(JSON.stringify({ error: "Missing matchId" }), {
        status: 400,
      });
    }

    // The season the doc actually lives in. Falling back to the timestamp would
    // move the write to a different collection whenever a match is rescheduled
    // across the season boundary, so an explicit seasonId wins.
    const year =
      typeof seasonId === "string" && /^\d{4}-\d{4}$/.test(seasonId)
        ? seasonId
        : getYearFromTimestamp(fields.timestamp);

    if (!year) {
      return new Response(JSON.stringify({ error: "Error calculating year" }), {
        status: 400,
      });
    }

    // The client sends an absolute ISO instant; anything else would be parsed in
    // the server's timezone (UTC in production) and silently shift the kickoff.
    if (fields.timestamp) {
      const parsed = new Date(fields.timestamp);
      if (isNaN(parsed.getTime())) {
        return new Response(JSON.stringify({ error: "Invalid timestamp" }), {
          status: 400,
        });
      }
      fields.timestamp = Timestamp.fromDate(parsed);
    }

    // Update the match document in Firestore
    const matchRef = doc(db, "matches", "seasons", year, matchId);
    await updateDoc(matchRef, fields);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    if (err?.code === "not-found") {
      return new Response(
        JSON.stringify({ error: "Match not found in that season" }),
        { status: 404 }
      );
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
