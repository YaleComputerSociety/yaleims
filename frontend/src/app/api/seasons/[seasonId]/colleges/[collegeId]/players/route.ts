import type { CollegePlayerList } from "@/lib/api/colleges";
import { toJson } from "@/lib/api/core";
import { authorize, can, requireCurrentSeason } from "@/server/auth";
import { listCollegePlayers } from "@/server/data/players";
import { listCollegeTeams } from "@/server/data/teams";
import { getUsers, identityOf } from "@/server/data/users";
import { ok, route } from "@/server/http";

type Params = { seasonId: string; collegeId: string };

/**
 * The college's players this season by name, with their identities (emails
 * for admins) and what they captain (the college's rep and captains, supervisors; current season:
 * the captain, MVP and roster pickers, the roles page). Graduates and people who haven't joined the season aren't
 * players (D30).
 */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, collegeId } = await params;
  const viewer = await authorize(can.listPlayers, collegeId);
  await requireCurrentSeason(seasonId);
  const [players, teams] = await Promise.all([
    listCollegePlayers(seasonId, collegeId),
    listCollegeTeams(seasonId, collegeId),
  ]);
  const [users, withEmail] = await Promise.all([getUsers(players.map((p) => p.id)), can.seeEmails(viewer)]);
  const captainOf = (playerId: string) => teams.filter((t) => t.captainIds.includes(playerId)).map((t) => t.sportId);
  const items = players
    .map((p) => ({ ...toJson(p), ...identityOf(users.get(p.id), p.name, withEmail), captainOf: captainOf(p.id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return ok({ items, total: items.length } satisfies CollegePlayerList);
});
