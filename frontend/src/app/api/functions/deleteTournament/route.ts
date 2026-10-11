import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { getCurrentSeason } from "@/server/data/seasons";
import { deleteTournament } from "@/server/services/tournaments";

/** { tournamentId, force? }: deletes a current-season tournament (admin/dev). */
export async function POST(req: Request) {
  try {
    const { tournamentId, force } = await req.json();
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
    if (!tournamentId || typeof tournamentId !== "string") {
      return Response.json(
        { error: "Invalid 'tournamentId' parameter in request body." },
        { status: 400 }
      );
    }
    const seasonId = (await getCurrentSeason())?.year;
    if (!seasonId) {
      return Response.json({ error: "Current season not found." }, { status: 500 });
    }

    const result = await deleteTournament(seasonId, tournamentId, force === true);
    if (result.status === "not-found") {
      return Response.json(
        { error: `Tournament '${tournamentId}' not found.` },
        { status: 404 }
      );
    }
    if (result.status === "has-scored-matches") {
      return Response.json(
        {
          error:
            `Tournament has ${result.scoredMatchIds.length} scored match(es). ` +
            "Deleting it takes back the points they earned.",
          scoredMatchIds: result.scoredMatchIds,
        },
        { status: 409 }
      );
    }
    return Response.json({
      message: `Successfully deleted tournament '${tournamentId}' and ${result.matchCount} associated matches.`,
    });
  } catch (err) {
    console.error("Error deleting tournament:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
