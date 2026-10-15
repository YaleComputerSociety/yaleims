import { getSession, getSessionToken } from "@/server/session";
import { listUpcomingSignups } from "@/server/data/users";
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

    const signups = await listUpcomingSignups(session.email, seasonId, new Date());
    if (!signups) {
      return new Response("User not found", { status: 404 });
    }
    return Response.json(signups satisfies UserSignupsResponse);
  } catch (err) {
    console.error("Error fetching user matches:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
