import { getSession, getSessionToken } from "@/server/session";
import { legacyMatchId } from "@/lib/legacyMatch";
import { getPlayer } from "@/server/data/players";
import { listPlayerEntries } from "@/server/data/roster";
import type { UserSignupsResponse } from "@/types/api";

/** ?seasonId=: the signed-in user's upcoming game sign-ups ({ id, timestamp }). */
export async function GET(req: Request) {
  try {
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const seasonId = new URL(req.url).searchParams.get("seasonId");
    if (!seasonId) {
      return Response.json({ error: "seasonId is required" }, { status: 400 });
    }
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    // Not a member of that season (D30): nothing to list.
    if (!(await getPlayer(seasonId, session.email))) {
      return new Response("User not found", { status: 404 });
    }
    const now = Date.now();
    const signups = (await listPlayerEntries(seasonId, session.email))
      .filter((e) => e.captainStatus !== "removed" && e.startsAt.toMillis() > now)
      .map((e) => ({ id: legacyMatchId(e.matchId), timestamp: e.startsAt.toDate().toISOString() }));
    return Response.json(signups satisfies UserSignupsResponse);
  } catch (err) {
    console.error("Error fetching user matches:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
