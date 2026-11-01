import { getSession, getSessionToken } from "@/server/session";
import { getMatches } from "@/server/data/matches";
import { getPlayer } from "@/server/data/players";
import { listPlayerEntries } from "@/server/data/roster";
import { legacyMatches } from "@/server/legacy";
import type { UserMatchObjectsResponse } from "@/types/api";

/** ?seasonId=: the user's upcoming games in the pre-v3 match shape (timestamps as ISO strings). */
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

    if (!(await getPlayer(seasonId, session.email))) {
      return new Response("User not found", { status: 404 });
    }
    const now = Date.now();
    const ids = (await listPlayerEntries(seasonId, session.email))
      .filter((e) => e.captainStatus !== "removed" && e.startsAt.toMillis() > now)
      .map((e) => e.matchId);
    const games = await getMatches(seasonId, ids);
    const found = ids.filter((id) => games.has(id)).map((id) => ({ id, ...games.get(id)! }));
    const legacy = new Map((await legacyMatches(seasonId, found)).map((m, i) => [found[i].id, m]));
    const matches = ids.map((id) => {
      const m = legacy.get(id);
      return m ? { ...m, timestamp: m.timestamp.toDate().toISOString() } : null;
    });
    return Response.json(matches satisfies UserMatchObjectsResponse);
  } catch (err) {
    console.error("Error fetching user match objects:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
