import type { CollegePlayerList } from "@/lib/api/colleges";
import { toJson } from "@/lib/api/core";
import { authorize, can, requireCurrentSeason } from "@/server/auth";
import { listCollegePlayers } from "@/server/data/players";
import { listCollegeTeams } from "@/server/data/teams";
import { displayName, getUsers } from "@/server/data/users";
import { ok, route } from "@/server/http";

type Params = { seasonId: string; collegeId: string };

/**
 * The college's players this season by name, with their NetIDs and what
 * they captain (the college's rep and captains, supervisors; current season:
 * the captain, MVP and roster pickers, the roles page). Graduates and people who haven't joined the season aren't
 * players (D30).
 */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, collegeId } = await params;
  await authorize(can.listPlayers, collegeId);
  await requireCurrentSeason(seasonId);
  const [players, teams] = await Promise.all([
    listCollegePlayers(seasonId, collegeId),
    listCollegeTeams(seasonId, collegeId),
  ]);
  const users = await getUsers(players.map((p) => p.id));
  const captainOf = (playerId: string) => teams.filter((t) => t.captainIds.includes(playerId)).map((t) => t.sportId);
  const items = players
    .map((p) => {
      const user = users.get(p.id);
      return { ...toJson(p), name: user ? displayName(user) : p.name, netid: user?.netid ?? null, captainOf: captainOf(p.id) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return ok({ items, total: items.length } satisfies CollegePlayerList);
});
