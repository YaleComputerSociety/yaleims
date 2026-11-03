import type { CollegePlayerList } from "@/lib/api/colleges";
import { toJson } from "@/lib/api/core";
import { authorize, can, requireCurrentSeason } from "@/server/auth";
import { listCollegePlayers } from "@/server/data/players";
import { listCollegeTeams } from "@/server/data/teams";
import { ok, route } from "@/server/http";

type Params = { seasonId: string; collegeId: string };

/**
 * The college's players this season by name, with what they captain (the
 * college's rep and devs, current season: the captain and MVP pickers, the
 * roles page). Graduates and people who haven't joined the season aren't
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
  const captainOf = (email: string) => teams.filter((t) => t.captainIds.includes(email)).map((t) => t.sportId);
  const items = players
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ ...toJson(p), captainOf: captainOf(p.id) }));
  return ok({ items, total: items.length } satisfies CollegePlayerList);
});
