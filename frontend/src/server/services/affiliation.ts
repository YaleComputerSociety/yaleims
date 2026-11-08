// A season player's college as an admin sets it (account plan, 4c): assign,
// change or clear it. In the same transaction, the old college's captaincies
// and rep role end (the new college's need an explicit appointment) and the
// player's sign-ups for the old college's games that haven't started are
// withdrawn; the player gets the new college's privileges at once. Games
// played stay: lib/attendance.ts judges each by the college held when it was
// played, from the history written here. Audit-logged with the admin's reason.
import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { assignmentsOf } from "@/lib/attendance";
import type { CollegeAssignment } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { listColleges } from "../data/colleges";
import { playerRef } from "../data/players";
import { playerEntriesQuery } from "../data/roster";
import { collegeTeamsRef } from "../data/teams";
import { displayName, readUser, userRef } from "../data/users";
import { expectRevision, runTransaction } from "../data/util";

export type CollegeChange = "ok" | "unchanged" | "no-user" | "unknown-college";

/**
 * Sets `userId`'s college this season (null: unassigned, which a later
 * directory lookup doesn't fill). Someone not yet a player this season
 * becomes one. `revision`: the player doc's as the admin saw it (null: none
 * yet); a changed doc is refused (409). Leaving it out skips the check.
 */
export async function setPlayerCollege(
  seasonId: string,
  userId: string,
  collegeId: string | null,
  reason: string,
  actor: Actor,
  revision?: string | null,
  now = new Date()
): Promise<CollegeChange> {
  if (collegeId && !(await listColleges(seasonId)).some((c) => c.id === collegeId)) return "unknown-college";
  const ref = playerRef(seasonId, userId);
  return runTransaction(async (tx) => {
    const [playerSnap, userSnap] = await Promise.all([tx.get(ref), tx.get(userRef(userId))]);
    if (revision !== undefined) expectRevision(playerSnap, revision);
    const player = playerSnap.data();
    const assignment: CollegeAssignment = { collegeId, source: "admin", since: Timestamp.fromDate(now) };
    if (!player) {
      if (!userSnap.exists) return "no-user";
      tx.create(ref, {
        seasonId, collegeId, collegeHistory: [assignment], name: displayName(readUser(userSnap.data()!)), userId, roles: [],
        joinedAt: FieldValue.serverTimestamp(), joinedVia: "admin",
      });
      logAction(tx, seasonId, { actor, action: "setPlayerCollege", params: { userId, from: null, to: collegeId, reason }, changed: [], created: [ref] });
      return "ok";
    }
    const old = player.collegeId;
    if (old === collegeId) return "unchanged";
    const teams = old ? (await tx.get(collegeTeamsRef(seasonId, old).where("captainIds", "array-contains", userId))).docs : [];
    const upcoming = old
      ? (await tx.get(playerEntriesQuery(seasonId, userId).where("startsAt", ">", Timestamp.fromDate(now)))).docs
          .filter((e) => e.data().collegeId === old)
      : [];

    // A doc from before November 2026 has no history yet: its college counts as assigned when they joined.
    const history: CollegeAssignment[] =
      player.collegeHistory ?? assignmentsOf(player).map((a) => ({ ...a, source: "legacy", since: player.joinedAt }));
    tx.update(ref, {
      collegeId,
      collegeHistory: [...history, assignment],
      roles: player.roles.filter((role) => role !== "college_rep"),
    });
    for (const team of teams) tx.update(team.ref, { captainIds: team.data().captainIds.filter((id) => id !== userId) });
    for (const entry of upcoming) tx.delete(entry.ref);
    logAction(tx, seasonId, {
      actor,
      action: "setPlayerCollege",
      params: { userId, from: old, to: collegeId, reason },
      changed: [playerSnap, ...teams, ...upcoming],
    });
    return "ok";
  });
}
