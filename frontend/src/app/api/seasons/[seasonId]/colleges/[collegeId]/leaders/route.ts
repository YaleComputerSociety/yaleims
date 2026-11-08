import type { CollegeLeaders } from "@/lib/api/colleges";
import { authorize, can } from "@/server/auth";
import { listCollegeReps } from "@/server/data/players";
import { listCollegeTeams } from "@/server/data/teams";
import { displayName, getUsers } from "@/server/data/users";
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
  const users = await getUsers([...reps.map((p) => p.id), ...teams.flatMap((t) => t.captainIds)]);
  const nameOf = (id: string, copy: string) => {
    const user = users.get(id);
    return user ? displayName(user) : copy;
  };
  return ok({
    reps: reps.map((p) => ({ playerId: p.id, name: nameOf(p.id, p.name), email: users.get(p.id)?.email ?? null })),
    captains: teams.flatMap((t) => t.captainIds.map((id) => ({ sportId: t.sportId, name: nameOf(id, id) }))),
  } satisfies CollegeLeaders);
});
