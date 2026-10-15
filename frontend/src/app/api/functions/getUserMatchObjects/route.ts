import { getSession, getSessionToken } from "@/server/session";
import { listUpcomingSignups } from "@/server/data/users";
import { getMatch } from "@/server/data/matches";
import type { UserMatchObjectsResponse } from "@/types/api";

/** ?seasonId=: the full match docs of the user's upcoming games (timestamps as ISO strings). */
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

    const signups = await listUpcomingSignups(session.email, seasonId, new Date());
    if (!signups) {
      return new Response("User not found", { status: 404 });
    }
    const matches = await Promise.all(
      signups.map(async ({ id }) => {
        const match = await getMatch(seasonId, id);
        return match && { ...match, timestamp: match.timestamp?.toDate().toISOString() };
      })
    );
    return Response.json(matches satisfies UserMatchObjectsResponse);
  } catch (err) {
    console.error("Error fetching user match objects:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
