import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { actorOf } from "@/server/data/auditLog";
import { bracketIdOf, playoffsName } from "@/lib/brackets";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { createBracket } from "@/server/services/brackets";

/** { bracketData: { sport, matches } }: creates this season's playoffs for a sport (admin/dev; audit-logged). */
export async function POST(req: Request) {
  try {
    const { bracketData } = await req.json();
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
    if (!bracketData || !bracketData.sport || !bracketData.matches) {
      return Response.json(
        { error: "Missing or invalid 'bracketData' parameter." },
        { status: 400 }
      );
    }
    const sport = String(bracketData.sport);
    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      return Response.json({ error: "Current season not found." }, { status: 500 });
    }

    const name = playoffsName(sport);
    const result = await createBracket(
      seasonId,
      { id: bracketIdOf(name), kind: "playoffs", name, sportName: sport, input: bracketData.matches, placementPoints: null },
      actorOf(session)
    );
    if (result.status === "exists") {
      return Response.json({ error: `Bracket for '${sport}' already exists.` }, { status: 409 });
    }
    if (result.status === "unknown-sport") {
      return Response.json({ error: `Unknown sport: ${sport}` }, { status: 400 });
    }
    if (result.status === "bad-input") {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({ message: `Bracket for '${sport}' created successfully.` });
  } catch (err) {
    console.error("Error creating bracket:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
