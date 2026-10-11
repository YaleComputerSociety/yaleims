import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { getCurrentSeason } from "@/server/data/seasons";
import {
  createTournament,
  normalizePlacementPoints,
  tournamentSlug,
} from "@/server/services/tournaments";

/**
 * { tournamentData: { name, sport, matches, placement_points? } }: creates a
 * tournament in the current season (admin/dev).
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
    const tournamentId = tournamentSlug(name);
    if (!tournamentId) {
      return Response.json(
        { error: "Tournament name must contain letters or numbers." },
        { status: 400 }
      );
    }
    const seasonId = (await getCurrentSeason())?.year;
    if (!seasonId) {
      return Response.json({ error: "Current season not found." }, { status: 500 });
    }

    const result = await createTournament(seasonId, {
      id: tournamentId,
      name,
      sport: String(tournamentData.sport),
      input: tournamentData.matches,
      placementPoints: normalizePlacementPoints(tournamentData.placement_points),
    });
    if (result === "exists") {
      return Response.json(
        { error: `Tournament '${name}' already exists this season.` },
        { status: 409 }
      );
    }
    if (result === "no-counter") {
      return Response.json({ error: "Cannot find next match ID" }, { status: 500 });
    }
    if (result === "id-taken") {
      return Response.json(
        { error: "A new match id is already in use (check counters/matches); nothing was created." },
        { status: 409 }
      );
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
