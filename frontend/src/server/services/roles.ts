// Changing roles. In v3 they live in three places: users/{userId}.roles
// (admin, dev: global), the season player doc's roles (college_rep,
// supervisor) and the teams a player captains this season (captain). Who
// holds which is read in server/auth.ts. Changing roles is audit-logged (D32).
import "server-only";
import { FieldValue, type DocumentReference, type DocumentSnapshot } from "firebase-admin/firestore";
import type { GlobalRole, PlayerDoc, SeasonRole } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { playerRef } from "../data/players";
import { getSport, listSports } from "../data/sports";
import { collegeTeamsRef, newTeam, teamRef } from "../data/teams";
import { userRef } from "../data/users";
import { runTransaction } from "../data/util";

const GLOBAL_ROLES: GlobalRole[] = ["admin", "dev"];
const SEASON_ROLES: SeasonRole[] = ["college_rep", "supervisor"];

/** Season roles and captaincies need the person's player doc; a rep's and a captain's, its college. */
export type Refusal = "no-user" | "not-in-season" | "no-college" | "unknown-sport";

/**
 * Sets a user's roles (the dev page): the global roles on the user, the
 * season roles on their player doc, and captain of exactly the teams of
 * `captainOf` (sport ids) in their college. Other values in `roles` are
 * ignored.
 */
export async function setUserRoles(
  seasonId: string,
  userId: string,
  roles: string[],
  captainOf: string[],
  actor: Actor
): Promise<"ok" | Refusal> {
  const sports = await listSports(seasonId);
  if (captainOf.some((id) => !sports.some((s) => s.id === id))) return "unknown-sport";
  const captainSportIds = [...new Set(captainOf)];
  const seasonRoles = SEASON_ROLES.filter((r) => roles.includes(r));

  return runTransaction(async (tx) => {
    const [userSnap, playerSnap] = await tx.getAll(userRef(userId), playerRef(seasonId, userId));
    if (!userSnap.exists) return "no-user";
    const player = playerSnap.data() as PlayerDoc | undefined;
    const collegeId = player?.collegeId ?? null;
    if ((seasonRoles.length > 0 || captainSportIds.length > 0) && !player) return "not-in-season";
    // A rep and a captain act for their college; a supervisor for every game, whatever their own (decision 3e).
    if ((seasonRoles.includes("college_rep") || captainSportIds.length > 0) && !collegeId) return "no-college";
    const teams = collegeId ? (await tx.get(collegeTeamsRef(seasonId, collegeId))).docs : [];

    const changed: DocumentSnapshot[] = [userSnap];
    const created: DocumentReference[] = [];
    tx.update(userRef(userId), { roles: GLOBAL_ROLES.filter((r) => roles.includes(r)) });
    if (player) {
      tx.update(playerRef(seasonId, userId), { roles: seasonRoles });
      changed.push(playerSnap);
    }
    for (const team of teams) {
      const wanted = captainSportIds.includes(team.id);
      if (wanted === team.data().captainIds.includes(userId)) continue;
      tx.update(team.ref, {
        captainIds: wanted ? FieldValue.arrayUnion(userId) : FieldValue.arrayRemove(userId),
      });
      changed.push(team);
    }
    for (const sportId of captainSportIds) {
      if (!collegeId || teams.some((t) => t.id === sportId)) continue;
      const ref = teamRef(seasonId, collegeId, sportId);
      tx.create(ref, { ...newTeam(seasonId, collegeId, sportId), captainIds: [userId] });
      created.push(ref);
    }
    logAction(tx, seasonId, {
      actor,
      action: "updateUserRoles",
      params: { userId, roles, captainOf },
      changed,
      created,
    });
    return "ok";
  });
}

/**
 * Makes a player of `collegeId` captain of its team in a sport, or not
 * (audit-logged). Who may is the route's check (server/auth.ts
 * can.manageCaptains: the college's rep or an admin, D42).
 */
export async function setCaptain(
  seasonId: string,
  collegeId: string,
  sportId: string,
  userId: string,
  assign: boolean,
  actor: Actor
): Promise<"ok" | "not-in-season" | "other-college" | "unknown-sport"> {
  if (!(await getSport(seasonId, sportId))) return "unknown-sport";
  return runTransaction(async (tx) => {
    const player = (await tx.get(playerRef(seasonId, userId))).data();
    if (!player) return "not-in-season";
    if (player.collegeId !== collegeId) return "other-college";
    const ref = teamRef(seasonId, collegeId, sportId);
    const team = await tx.get(ref);

    if (team.exists) {
      tx.update(ref, {
        captainIds: assign ? FieldValue.arrayUnion(userId) : FieldValue.arrayRemove(userId),
      });
    } else if (assign) {
      tx.create(ref, { ...newTeam(seasonId, collegeId, sportId), captainIds: [userId] });
    }
    logAction(tx, seasonId, {
      actor,
      action: assign ? "assignCaptain" : "removeCaptain",
      params: { userId, collegeId, sportId },
      changed: team.exists ? [team] : [],
      created: !team.exists && assign ? [ref] : [],
    });
    return "ok";
  });
}
