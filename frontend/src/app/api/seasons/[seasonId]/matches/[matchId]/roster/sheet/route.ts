import { ApiError } from "@/lib/api/core";
import { toOwnEntry, type CaptainCall, type RosterSheet } from "@/lib/api/roster";
import { can, requireViewer } from "@/server/auth";
import { gamesPlayedBefore } from "@/lib/attendance";
import { getMatch, getMatches } from "@/server/data/matches";
import { listPlayerEntries, listRoster } from "@/server/data/roster";
import { getPlayers } from "@/server/data/players";
import { getTeam } from "@/server/data/teams";
import { displayName, getUsers, identityOf } from "@/server/data/users";
import { ok, route } from "@/server/http";
import type { RosterEntryDoc } from "@/types/firestore";

type Params = { seasonId: string; matchId: string };

/**
 * The sheet captains and supervisors work on: every entry on the sides the
 * caller manages (both for a supervisor; a captain's own college) and which
 * of them they captain (a supervisor may captain one too), taken-off
 * players too, with their ids and identities (emails for admins), and
 * whether they have signed in and have a college this season, who made
 * the captain's call (a captain by name; a supervisor by name for staff, by
 * role only for captains: their names mean nothing to students), and how
 * many games of the sport they played before this one.
 */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, matchId } = await params;
  const viewer = await requireViewer();
  const match = await getMatch(seasonId, matchId);
  if (!match) throw new ApiError("not-found", "No such game this season.");
  const supervisor = await can.takeAttendance(viewer);
  const captained = await Promise.all(match.collegeIds.map((c) => can.prepareRoster(viewer, c, match.sportId)));
  const captainOf = match.collegeIds.filter((_, i) => captained[i]);
  const collegeIds = supervisor ? match.collegeIds : captainOf;
  if (collegeIds.length === 0) throw new ApiError("forbidden", "You don't have permission to do this.");

  const entries = (await listRoster(seasonId, matchId)).filter((e) => collegeIds.includes(e.collegeId));
  const ids = entries.map((e) => e.playerId);
  const callers = entries.flatMap((e) => (e.captainStatus && e.captainBy ? [e.captainBy] : []));
  const [users, players, withEmail, teams, histories] = await Promise.all([
    getUsers([...ids, ...callers]),
    getPlayers(seasonId, ids),
    can.seeEmails(viewer),
    Promise.all(collegeIds.map((c) => getTeam(seasonId, c, match.sportId))),
    Promise.all(ids.map((id) => listPlayerEntries(seasonId, id))),
  ]);
  const inSport = histories.flat().filter((e) => e.sportId === match.sportId);
  const games = await getMatches(seasonId, [...new Set(inSport.map((e) => e.matchId))]);
  const played = new Map(ids.map((id, i) => [id, gamesPlayedBefore(match, histories[i], games)]));
  const captainIds = new Set(teams.flatMap((t) => t?.captainIds ?? []));
  const callOf = (e: RosterEntryDoc): CaptainCall | null => {
    if (!e.captainStatus || !e.captainBy) return null;
    // Stored since 2026-11-09; an older call by a current captain of the team was theirs.
    const role = e.captainByRole ?? (captainIds.has(e.captainBy) ? "captain" : "supervisor");
    const caller = users.get(e.captainBy);
    return { by: role, name: caller && (role === "captain" || supervisor) ? displayName(caller) : null };
  };
  const items = entries.map((e) => {
    const user = users.get(e.playerId);
    return {
      ...toOwnEntry(e),
      ...identityOf(user, e.name, withEmail),
      signedIn: !!user?.claimedAt,
      collegeAssigned: !!players.get(e.playerId)?.collegeId,
      captainCall: callOf(e),
      gamesPlayed: played.get(e.playerId) ?? 0,
    };
  });
  return ok({ collegeIds, supervisor, captainOf, items, total: items.length } satisfies RosterSheet);
});
