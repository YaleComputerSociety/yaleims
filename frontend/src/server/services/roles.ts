// Roles. In v3 they live in three places: users/{email}.roles (admin, dev:
// global), the season player doc's roles (college_rep, supervisor) and the
// teams a player captains this season (captain). The session still carries
// them merged into one list, mRoles, which every route checks. Changing
// roles is audit-logged (D32).
import "server-only";
import { FieldValue, type DocumentReference, type DocumentSnapshot } from "firebase-admin/firestore";
import type { GlobalRole, PlayerDoc, SeasonRole, UserDoc } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { playerRef } from "../data/players";
import { listSports } from "../data/sports";
import { collegeTeamsRef, listCaptainTeams, listCollegeTeams, newTeam, teamRef } from "../data/teams";
import { userRef } from "../data/users";
import { runTransaction } from "../data/util";

const GLOBAL_ROLES: GlobalRole[] = ["admin", "dev"];
const SEASON_ROLES: SeasonRole[] = ["college_rep", "supervisor"];

/** The session's role list: "user", the global and season roles, and "captain". */
export function mergedRoles(
  user: Pick<UserDoc, "roles"> | null,
  player: Pick<PlayerDoc, "roles"> | null,
  isCaptain: boolean
): string[] {
  return ["user", ...(user?.roles ?? []), ...(player?.roles ?? []), ...(isCaptain ? ["captain"] : [])];
}

/** Names of the sports a player captains this season. */
export async function captainSportNames(seasonId: string, playerId: string): Promise<string[]> {
  const [teams, sports] = await Promise.all([
    listCaptainTeams(seasonId, playerId),
    listSports(seasonId),
  ]);
  const nameOf = new Map(sports.map((s) => [s.id, s.name]));
  return teams.map((t) => nameOf.get(t.sportId) ?? t.sportId);
}

/** For a college this season: the sports each of its captains captains, by email. */
export async function captainSportsInCollege(
  seasonId: string,
  collegeId: string
): Promise<Map<string, string[]>> {
  const [teams, sports] = await Promise.all([
    listCollegeTeams(seasonId, collegeId),
    listSports(seasonId),
  ]);
  const nameOf = new Map(sports.map((s) => [s.id, s.name]));
  const result = new Map<string, string[]>();
  for (const team of teams) {
    for (const email of team.captainIds) {
      result.set(email, [...(result.get(email) ?? []), nameOf.get(team.sportId) ?? team.sportId]);
    }
  }
  return result;
}

/** Season roles and captaincies need the person's player doc and its college. */
export type Refusal = "no-user" | "not-in-season" | "no-college" | "unknown-sport";

/**
 * Sets a user's roles from the dev page's merged list: global roles on the
 * user, season roles on their player doc, and with "captain" exactly the
 * teams of `captainOf` (sport names) in their college.
 */
export async function setUserRoles(
  seasonId: string,
  email: string,
  roles: string[],
  captainOf: string[],
  actor: Actor
): Promise<"ok" | Refusal> {
  const sports = await listSports(seasonId);
  const captainSportIds: string[] = [];
  for (const name of roles.includes("captain") ? captainOf : []) {
    const sport = sports.find((s) => s.name === name);
    if (!sport) return "unknown-sport";
    captainSportIds.push(sport.id);
  }
  const seasonRoles = SEASON_ROLES.filter((r) => roles.includes(r));

  return runTransaction(async (tx) => {
    const [userSnap, playerSnap] = await tx.getAll(userRef(email), playerRef(seasonId, email));
    if (!userSnap.exists) return "no-user";
    const player = playerSnap.data() as PlayerDoc | undefined;
    const collegeId = player?.collegeId ?? null;
    if (seasonRoles.length > 0 || captainSportIds.length > 0) {
      if (!player) return "not-in-season";
      if (!collegeId) return "no-college";
    }
    const teams = collegeId ? (await tx.get(collegeTeamsRef(seasonId, collegeId))).docs : [];

    const changed: DocumentSnapshot[] = [userSnap];
    const created: DocumentReference[] = [];
    tx.update(userRef(email), { roles: GLOBAL_ROLES.filter((r) => roles.includes(r)) });
    if (player) {
      tx.update(playerRef(seasonId, email), { roles: seasonRoles });
      changed.push(playerSnap);
    }
    for (const team of teams) {
      const wanted = captainSportIds.includes(team.id);
      if (wanted === team.data().captainIds.includes(email)) continue;
      tx.update(team.ref, {
        captainIds: wanted ? FieldValue.arrayUnion(email) : FieldValue.arrayRemove(email),
      });
      changed.push(team);
    }
    for (const sportId of captainSportIds) {
      if (!collegeId || teams.some((t) => t.id === sportId)) continue;
      const ref = teamRef(seasonId, collegeId, sportId);
      tx.create(ref, { ...newTeam(seasonId, collegeId, sportId), captainIds: [email] });
      created.push(ref);
    }
    logAction(tx, seasonId, {
      actor,
      action: "updateUserRoles",
      params: { userId: email, roles, sportsCaptainOf: captainOf },
      changed,
      created,
    });
    return "ok";
  });
}

/** Makes a player captain of a sport's team in their college, or not. */
export async function setCaptain(
  seasonId: string,
  email: string,
  sportName: string,
  assign: boolean,
  actor: Actor
): Promise<"ok" | Exclude<Refusal, "no-user">> {
  const sport = (await listSports(seasonId)).find((s) => s.name === sportName);
  if (!sport) return "unknown-sport";
  return runTransaction(async (tx) => {
    const player = (await tx.get(playerRef(seasonId, email))).data();
    if (!player) return "not-in-season";
    if (!player.collegeId) return "no-college";
    const ref = teamRef(seasonId, player.collegeId, sport.id);
    const team = await tx.get(ref);

    if (team.exists) {
      tx.update(ref, {
        captainIds: assign ? FieldValue.arrayUnion(email) : FieldValue.arrayRemove(email),
      });
    } else if (assign) {
      tx.create(ref, { ...newTeam(seasonId, player.collegeId, sport.id), captainIds: [email] });
    }
    logAction(tx, seasonId, {
      actor,
      action: assign ? "assignCaptain" : "removeCaptain",
      params: { email, sport: sportName },
      changed: team.exists ? [team] : [],
      created: !team.exists && assign ? [ref] : [],
    });
    return "ok";
  });
}
