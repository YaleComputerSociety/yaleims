import { getSession, getSessionToken, hasAnyRole } from "@/server/session";
import { listColleges } from "@/server/data/colleges";
import { getPlayer, listCollegePlayers } from "@/server/data/players";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { getUsers } from "@/server/data/users";
import { legacyUser } from "@/server/legacy";
import { captainSportsInCollege } from "@/server/services/roles";
import type { UsersInCollegeResponse } from "@/types/api";

/**
 * The college rep's own college: its players this season (D30: graduates and
 * people who haven't joined the season aren't listed), plus its captains
 * when ?wantCaptains=true.
 */
export async function GET(req: Request) {
  try {
    if (!(await getSessionToken())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
    if (!hasAnyRole(session, ["college_rep"])) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const seasonId = await getCurrentSeasonId();
    const collegeId = seasonId && (await getPlayer(seasonId, session.email))?.collegeId;
    const players = seasonId && collegeId ? await listCollegePlayers(seasonId, collegeId) : [];
    if (!seasonId || !collegeId || players.length === 0) {
      return Response.json({ error: "No users found" }, { status: 404 });
    }
    const [users, captainOf, colleges] = await Promise.all([
      getUsers(players.map((p) => p.id)),
      captainSportsInCollege(seasonId, collegeId),
      listColleges(seasonId),
    ]);
    const collegeName = colleges.find((c) => c.id === collegeId)?.name ?? null;
    const all = players.map((p) =>
      legacyUser(p.id, users.get(p.id), p, collegeName, captainOf.get(p.id) ?? [])
    );
    if (new URL(req.url).searchParams.get("wantCaptains") !== "true") {
      return Response.json({ users: all } satisfies UsersInCollegeResponse);
    }
    const captains = all
      .filter((u) => u.sportsCaptainOf!.length > 0)
      .map((u) => ({
        firstName: u.firstname,
        lastName: u.lastname,
        email: u.email,
        sportsCaptainOf: u.sportsCaptainOf,
      }));
    return Response.json({ users: all, captains } satisfies UsersInCollegeResponse);
  } catch (err) {
    console.error("Error fetching users in college:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
