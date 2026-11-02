import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { actorOf } from "@/server/data/auditLog";
import { bracketIdOf } from "@/lib/brackets";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { findSportByName } from "@/server/data/sports";
import { slotsFromForm } from "@/lib/api/brackets";
import { createBracket, normalizePlacementPoints } from "@/server/services/brackets";

/**
 * { tournamentData: { name, sport, matches, placement_points? } }: creates a
 * tournament in the current season (admin/dev; audit-logged).
 */
export async function POST(req: Request) {
  try {
    const { tournamentData } = await req.json();
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
      !tournamentData ||
      !tournamentData.sport ||
      !tournamentData.name ||
      !Array.isArray(tournamentData.matches)
    ) {
      return Response.json(
        { error: "Missing or invalid 'tournamentData' parameter." },
        { status: 400 }
      );
    }
    const name = String(tournamentData.name).trim();
    const tournamentId = bracketIdOf(name);
    if (!tournamentId) {
      return Response.json(
        { error: "Tournament name must contain letters or numbers." },
        { status: 400 }
      );
    }
    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      return Response.json({ error: "Current season not found." }, { status: 500 });
    }

    // The old upload names the sport and the slot fields the pre-v3 way.
    const sport = await findSportByName(seasonId, String(tournamentData.sport));
    const result = sport
      ? await createBracket(
          seasonId,
          {
            kind: "tournament",
            name,
            sportId: sport.id,
            slots: slotsFromForm(tournamentData.matches),
            placementPoints: normalizePlacementPoints(tournamentData.placement_points),
          },
          actorOf(session)
        )
      : ({ status: "unknown-sport" } as const);
    if (result.status === "exists") {
      return Response.json(
        { error: `Tournament '${name}' already exists this season.` },
        { status: 409 }
      );
    }
    if (result.status === "unknown-sport") {
      return Response.json({ error: `Unknown sport: ${tournamentData.sport}` }, { status: 400 });
    }
    if (result.status === "bad-input") {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({
      message: `Tournament '${name}' created successfully.`,
      tournamentId,
    });
  } catch (err) {
    console.error("Error creating tournament:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
