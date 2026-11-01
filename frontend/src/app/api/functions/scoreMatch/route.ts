import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { actorOf } from "@/server/data/auditLog";
import { scoreMatch } from "@/server/services/scoring";

/**
 * Records a match result (admin/dev; audit-logged). The points come from the
 * game (its sport's points when it was created); `sport` is still required.
 * Errors use `message`, as they always have.
 */
export async function POST(req: Request) {
  try {
    const {
      matchId,
      homeScore,
      awayScore,
      homeForfeit,
      awayForfeit,
      homeTeam,
      awayTeam,
      sport,
      year,
    } = await req.json();
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
    if (
      !matchId ||
      typeof homeScore !== "number" ||
      typeof awayScore !== "number" ||
      typeof homeForfeit !== "boolean" ||
      typeof awayForfeit !== "boolean" ||
      typeof sport !== "string" ||
      typeof year !== "string"
    ) {
      return Response.json({ message: "Error with parameters" }, { status: 400 });
    }

    const result = await scoreMatch(
      {
        seasonId: year,
        matchId: String(matchId),
        homeScore,
        awayScore,
        homeForfeit,
        awayForfeit,
        homeTeam,
        awayTeam,
      },
      actorOf(session)
    );
    if (result === "not-found") {
      return Response.json({ message: "Match not found." }, { status: 404 });
    }
    if (result === "already-scored") {
      return Response.json({ message: "This match has already been scored." }, { status: 400 });
    }
    if (result === "incomplete") {
      return Response.json({ message: "The match has no college on one side." }, { status: 400 });
    }
    return Response.json({
      success: true,
      message: "Match and colleges updated successfully.",
    });
  } catch (err: any) {
    console.error("Error scoring match:", err);
    return Response.json(
      { success: false, message: "Internal Server Error", error: err.message },
      { status: 500 }
    );
  }
}
