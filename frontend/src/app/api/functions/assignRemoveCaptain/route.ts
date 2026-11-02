import { can, getViewer } from "@/server/auth";
import { getPlayer } from "@/server/data/players";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { findSportByName } from "@/server/data/sports";
import { getSessionToken } from "@/server/session";
import { setCaptain } from "@/server/services/roles";

/**
 * { email, sport, assign | remove }: makes a player captain of their
 * college's team in a sport this season, or not (audit-logged). Only that
 * college's rep or an admin may (D42).
 */
export async function POST(req: Request) {
  try {
    const { email, sport, assign, remove } = await req.json();
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const viewer = await getViewer();
    if (!viewer) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
    if (!email || !sport) {
      return Response.json({ error: "Missing email or sport" }, { status: 400 });
    }
    if (!assign && !remove) {
      return Response.json(
        { error: "Must specify either assign or remove" },
        { status: 400 }
      );
    }
    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      return Response.json({ error: "Current season not found." }, { status: 500 });
    }

    const player = await getPlayer(seasonId, String(email));
    if (!player) {
      return Response.json({ error: "User not found in this season" }, { status: 404 });
    }
    if (!player.collegeId) {
      return Response.json({ error: "User has no college this season" }, { status: 400 });
    }
    if (!(await can.manageCaptains(viewer, player.collegeId))) {
      return Response.json({ error: "Only the player's college rep or an admin can change captains" }, { status: 403 });
    }
    const sportDoc = await findSportByName(seasonId, String(sport));
    if (!sportDoc) {
      return Response.json({ error: `Unknown sport: ${sport}` }, { status: 400 });
    }
    await setCaptain(seasonId, player.collegeId, sportDoc.id, String(email), !remove, await viewer.actor());
    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Error assigning/removing captain:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
