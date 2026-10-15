import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { getCurrentSeason } from "@/server/data/seasons";
import { deleteBracket } from "@/server/services/brackets";

/**
 * { sport, force? }: deletes this season's bracket for a sport and takes back
 * the points its games earned (admin/dev). With scored games it answers 409
 * until resent with force.
 */
export async function POST(req: Request) {
  try {
    const { sport, force } = await req.json();
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
    if (!hasAnyRole(session, ["admin", "dev"])) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!sport || typeof sport !== "string") {
      return Response.json(
        { error: "Invalid 'sport' parameter in request body." },
        { status: 400 }
      );
    }
    const seasonId = (await getCurrentSeason())?.year;
    if (!seasonId) {
      return Response.json({ error: "Current season not found." }, { status: 500 });
    }

    const result = await deleteBracket(seasonId, sport, force === true);
    if (result.status === "not-found") {
      return Response.json({ error: `Bracket for sport '${sport}' not found.` }, { status: 404 });
    }
    if (result.status === "has-scored-matches") {
      return Response.json(
        {
          error:
            `Bracket has ${result.scoredMatchIds.length} scored match(es). ` +
            "Deleting it takes back the points they earned.",
          scoredMatchIds: result.scoredMatchIds,
        },
        { status: 409 }
      );
    }
    return Response.json({
      message: `Successfully deleted bracket for sport '${sport}' and ${result.matchCount} associated matches.`,
    });
  } catch (err) {
    console.error("Error deleting bracket:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
