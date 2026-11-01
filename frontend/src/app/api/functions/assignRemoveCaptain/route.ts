import { getSession, getSessionToken } from "@/server/session";
import { actorOf } from "@/server/data/auditLog";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { setCaptain } from "@/server/services/roles";

/**
 * { email, sport, assign | remove }: makes a player captain of their
 * college's team in a sport this season, or not (audit-logged). Only that
 * college's rep or an admin may (D42).
 */
export async function POST(req: Request) {
  try {
    const { email, sport, assign, remove } = await req.json();
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
    if (!email || !sport) {
      return Response.json({ error: "Missing email or sport" }, { status: 400 });
    }
    if (!assign && !remove) {
      return Response.json(
        { error: "Must specify either assign or remove" },
        { status: 400 }
      );
    }
    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      return Response.json({ error: "Current season not found." }, { status: 500 });
    }

    const result = await setCaptain(seasonId, String(email), String(sport), !remove, actorOf(session));
    if (result === "forbidden") {
      return Response.json({ error: "Only the player's college rep or an admin can change captains" }, { status: 403 });
    }
    if (result === "not-in-season") {
      return Response.json({ error: "User not found in this season" }, { status: 404 });
    }
    if (result === "no-college") {
      return Response.json({ error: "User has no college this season" }, { status: 400 });
    }
    if (result === "unknown-sport") {
      return Response.json({ error: `Unknown sport: ${sport}` }, { status: 400 });
    }
    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Error assigning/removing captain:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
