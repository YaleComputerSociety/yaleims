import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { actorOf } from "@/server/data/auditLog";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { findSportByName } from "@/server/data/sports";
import { slotsFromForm } from "@/lib/api/brackets";
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

    // The old upload names the sport and the slot fields the pre-v3 way.
    const sportDoc = await findSportByName(seasonId, sport);
    const result = sportDoc
      ? await createBracket(
          seasonId,
          { kind: "playoffs", sportId: sportDoc.id, slots: slotsFromForm(bracketData.matches) },
          actorOf(session)
        )
      : ({ status: "unknown-sport" } as const);
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
