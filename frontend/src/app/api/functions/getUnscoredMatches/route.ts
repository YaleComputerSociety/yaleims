import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { listUnscoredPastMatches } from "@/server/data/matches";
import type { RouteBody, UnscoredMatchesResponse } from "@/types/api";

/** ?seasonId=: matches that started but have no score yet (admin/dev). */
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
    if (!hasAnyRole(session, ["admin", "dev"])) {
      return Response.json({ error: "Unauthorized User" }, { status: 401 });
    }

    const matches = await listUnscoredPastMatches(seasonId, new Date());
    return Response.json({
      success: true,
      matches,
    } satisfies RouteBody<UnscoredMatchesResponse>);
  } catch (err) {
    console.error("Error fetching unscored matches:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
