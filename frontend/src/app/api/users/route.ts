import { toJson } from "@/lib/api/core";
import { roleHoldersQuerySchema, type RoleHolderList } from "@/lib/api/users";
import { authorize, can } from "@/server/auth";
import { getPlayers } from "@/server/data/players";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { listCaptainTeams } from "@/server/data/teams";
import { listUsersWithRole } from "@/server/data/users";
import { ok, readQuery, route } from "@/server/http";
import type { PlayerDoc } from "@/types/firestore";

/** Everyone holding a global role, with their player doc this season and what they captain (devs). */
export const GET = route(async (req) => {
  await authorize(can.manageRoles);
  const { role } = readQuery(req, roleHoldersQuerySchema);
  const [users, seasonId] = await Promise.all([listUsersWithRole(role), getCurrentSeasonId()]);
  const ids = users.map((u) => u.id);
  // A few people (the admins and devs): one captaincy query each.
  const [players, captainOf] = await Promise.all([
    seasonId ? getPlayers(seasonId, ids) : new Map<string, PlayerDoc>(),
    Promise.all(ids.map(async (id) => (seasonId ? (await listCaptainTeams(seasonId, id)).map((t) => t.sportId) : []))),
  ]);
  const items = users.map((user, i) => ({
    ...toJson(user),
    player: players.has(user.id) ? toJson(players.get(user.id)!) : null,
    captainOf: captainOf[i],
  }));
  return ok({ items, total: items.length } satisfies RoleHolderList);
});
