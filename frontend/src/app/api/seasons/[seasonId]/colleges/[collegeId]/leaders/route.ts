import type { CollegeLeaders } from "@/lib/api/colleges";
import { authorize, can } from "@/server/auth";
import { getPlayers, listCollegeReps } from "@/server/data/players";
import { listCollegeTeams } from "@/server/data/teams";
import { ok, route } from "@/server/http";

type Params = { seasonId: string; collegeId: string };

/** The college's reps (with emails: they are its contacts) and captains by name (its own players). */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, collegeId } = await params;
  await authorize(can.seeLeaders, collegeId);
  const [reps, teams] = await Promise.all([
    listCollegeReps(seasonId, collegeId),
    listCollegeTeams(seasonId, collegeId),
  ]);
  const captains = await getPlayers(seasonId, [...new Set(teams.flatMap((t) => t.captainIds))]);
  return ok({
    reps: reps.map((p) => ({ playerId: p.id, name: p.name })),
    captains: teams.flatMap((t) =>
      t.captainIds.map((id) => ({ sportId: t.sportId, name: captains.get(id)?.name ?? id }))
    ),
  } satisfies CollegeLeaders);
});
