import { ApiError, toJson } from "@/lib/api/core";
import type { RosterSheet } from "@/lib/api/roster";
import { can, requireViewer } from "@/server/auth";
import { getMatch } from "@/server/data/matches";
import { listRoster } from "@/server/data/roster";
import { getPlayers } from "@/server/data/players";
import { getUsers, identityOf } from "@/server/data/users";
import { ok, route } from "@/server/http";

type Params = { seasonId: string; matchId: string };

/**
 * The sheet captains and supervisors work on: every entry on the sides the
 * caller manages (both for a supervisor; a captain's own college), taken-off
 * players too, with their ids and identities (emails for admins), and
 * whether they have signed in and have a college this season.
 */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await requireViewer();
  const match = await getMatch(seasonId, matchId);
  if (!match) throw new ApiError("not-found", "No such game this season.");
  const supervisor = await can.takeAttendance(viewer);
  const managed = await Promise.all(match.collegeIds.map((c) => can.manageRoster(viewer, c, match.sportId)));
  const collegeIds = match.collegeIds.filter((_, i) => managed[i]);
  if (collegeIds.length === 0) throw new ApiError("forbidden", "You don't have permission to do this.");

  const entries = (await listRoster(seasonId, matchId)).filter((e) => collegeIds.includes(e.collegeId));
  const ids = entries.map((e) => e.playerId);
  const [users, players, withEmail] = await Promise.all([getUsers(ids), getPlayers(seasonId, ids), can.seeEmails(viewer)]);
  const items = entries.map((e) => {
    const user = users.get(e.playerId);
    return { ...toJson(e), ...identityOf(user, e.name, withEmail), signedIn: !!user?.claimedAt, collegeAssigned: !!players.get(e.playerId)?.collegeId };
  });
  return ok({ collegeIds, supervisor, items, total: items.length } satisfies RosterSheet);
});
