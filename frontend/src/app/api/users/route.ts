import { toJson } from "@/lib/api/core";
import { roleHoldersQuerySchema, type RoleHolderList } from "@/lib/api/users";
import { authorize, can } from "@/server/auth";
import { getPlayers, listPlayersWithRole } from "@/server/data/players";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { listCaptainTeams } from "@/server/data/teams";
import { getUsers, listUsersWithRole } from "@/server/data/users";
import { ok, readQuery, route } from "@/server/http";
import type { PlayerDoc, UserDoc, WithId } from "@/types/firestore";

/** Everyone holding a role (global, or this season's supervisors), with their player doc this season and what they captain (admins). */
export const GET = route(async (req) => {
  await authorize(can.manageRoles);
  const { role } = readQuery(req, roleHoldersQuerySchema);
  const seasonId = await getCurrentSeasonId();
  const users = role === "supervisor" ? await supervisors(seasonId) : await listUsersWithRole(role);
  const ids = users.map((u) => u.id);
  // A few people: one captaincy query each.
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

/** This season's supervisors, as users. */
async function supervisors(seasonId: string | null): Promise<WithId<UserDoc>[]> {
  if (!seasonId) return [];
  const ids = (await listPlayersWithRole(seasonId, "supervisor")).map((p) => p.id);
  const users = await getUsers(ids);
  return ids.flatMap((id) => (users.has(id) ? [{ id, ...users.get(id)! }] : []));
}
