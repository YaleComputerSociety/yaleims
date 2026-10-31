import { getSession, hasAnyRole } from "@/server/session";
import { collegeIdOfName } from "@/lib/colleges";
import { listColleges } from "@/server/data/colleges";
import { getPlayer, listCollegePlayers } from "@/server/data/players";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { getUsers, listUsersWithRole } from "@/server/data/users";
import { legacyUser } from "@/server/legacy";
import { captainSportNames, captainSportsInCollege } from "@/server/services/roles";
import type { SpecialUsersResponse } from "@/types/api";
import type { PlayerDoc } from "@/types/firestore";

/** Someone to list: their player doc this season (if any) and the sports they captain. */
interface Person {
  email: string;
  player: PlayerDoc | undefined;
  captainOf: string[];
}

/** Every admin or dev (global roles). */
async function listRoleHolders(seasonId: string, role: "admin" | "dev"): Promise<Person[]> {
  const users = await listUsersWithRole(role);
  return Promise.all(
    users.map(async (u) => ({
      email: u.id,
      player: (await getPlayer(seasonId, u.id)) ?? undefined,
      captainOf: await captainSportNames(seasonId, u.id),
    }))
  );
}

/** A college's captains and college reps this season. */
async function listCollegeLeaders(seasonId: string, collegeId: string): Promise<Person[]> {
  const [players, captainOf] = await Promise.all([
    listCollegePlayers(seasonId, collegeId),
    captainSportsInCollege(seasonId, collegeId),
  ]);
  return players
    .map((p) => ({ email: p.id, player: p, captainOf: captainOf.get(p.id) ?? [] }))
    .filter((p) => p.captainOf.length > 0 || p.player.roles.includes("college_rep"));
}

/**
 * ?college=: "Admin" or "Dev" lists every admin / dev; a college name lists
 * that college's captains and college reps this season (dev only).
 */
export async function GET(req: Request) {
  try {
    if (!hasAnyRole(await getSession(), ["dev"])) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 403,
      });
    }

    const { searchParams } = new URL(req.url);
    const college = searchParams.get("college");

    if (!college) {
      return new Response(
        JSON.stringify({ error: "Missing college parameter" }),
        {
          status: 400,
        }
      );
    }
    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      return new Response(JSON.stringify({ error: "current season not found" }), { status: 500 });
    }
    const colleges = await listColleges(seasonId);
    const collegeId = collegeIdOfName(colleges, college);

    // "Admin" and "Dev" are pseudo-colleges listing those roles everywhere.
    const people =
      college === "Admin" || college === "Dev"
        ? await listRoleHolders(seasonId, college === "Admin" ? "admin" : "dev")
        : collegeId
          ? await listCollegeLeaders(seasonId, collegeId)
          : [];
    const users = await getUsers(people.map((p) => p.email));
    const collegeName = (id: string | null | undefined) =>
      colleges.find((c) => c.id === id)?.name ?? null;
    const specialUsers = people.map(({ email, player, captainOf }) => ({
      id: email,
      ...legacyUser(email, users.get(email), player, collegeName(player?.collegeId), captainOf),
    }));

    return new Response(JSON.stringify({ users: specialUsers } satisfies SpecialUsersResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
