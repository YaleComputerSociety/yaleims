import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { undoScore } from "@/server/services/scoring";

/** { matchId, year }: clears a match result and takes its points back (admin/dev). */
export async function POST(req: Request) {
  try {
    const { matchId, year } = await req.json();
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
    if (!matchId) {
      return Response.json({ error: "Match ID is required." }, { status: 400 });
    }
    if (!year || typeof year !== "string") {
      return Response.json({ error: "Season (year) is required." }, { status: 400 });
    }

    const result = await undoScore(year, String(matchId));
    if (result === "not-found") {
      return Response.json(
        { error: `Match with ID ${matchId} does not exist.` },
        { status: 404 }
      );
    }
    if (result === "incomplete") {
      return Response.json({ error: "Match data is incomplete or invalid." }, { status: 400 });
    }
    return Response.json({
      message: "Score match successfully undone and ranks updated.",
    });
  } catch (err: any) {
    console.error("Error undoing score match:", err);
    return Response.json(
      { message: "Internal Server Error", error: err.message },
      { status: 500 }
    );
  }
}
