// The People view (admins; account plan, step 9): finding a person by exact
// NetID or in the lists of those without a college this season or who
// haven't signed in; one person's identity, season and every game they're
// recorded on (taken-off ones and games since deleted too); and the
// corrections of name, email and one game's attendance. Each correction
// checks the revision it was made on (data/util.ts expectRevision) and is
// audit-logged with the admin's reason. College changes: services/affiliation.ts.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { toOwnReview } from "@/lib/api/reviews";
import { assignmentsOf, disputed } from "@/lib/attendance";
import type { AttendanceFix, Person, PersonSummary, ProfileFix } from "@/lib/api/people";
import { toJson } from "@/lib/api/core";
import type { PlayerDoc, RosterEntryDoc, UserDoc, WithId } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { getMatches } from "../data/matches";
import { getPlayers, playerRef } from "../data/players";
import { listOwnRequests } from "../data/reviewRequests";
import { playerEntriesQuery, rosterEntryRef } from "../data/roster";
import { listCaptainTeams } from "../data/teams";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import { displayName, findUserByNetid, getUsers, readUser, userRef, usersByNetidQuery } from "../data/users";
import { expectRevision, revisionOf, runTransaction } from "../data/util";

/** At most this many people in a list. */
const LIST_LIMIT = 200;

// ── Finding people ─────────────────────────────────────────────────────────

/** Every account recording this NetID: normally one; two show a conflict to sort out (a sign-in or add refuses it). */
export async function findByNetid(netid: string, seasonId: string | null): Promise<PersonSummary[]> {
  const holders = await usersByNetidQuery(netid).get();
  return summaries(holders.docs.map((d) => ({ id: d.id, ...readUser(d.data()) })), seasonId);
}

/** This season's players without a college. */
export async function listUnassigned(seasonId: string): Promise<PersonSummary[]> {
  const snap = await adminDb.collection(paths.players(seasonId)).where("collegeId", "==", null).limit(LIST_LIMIT).get();
  const users = await getUsers(snap.docs.map((d) => d.id));
  return summaries([...users].map(([id, user]) => ({ id, ...user })), seasonId);
}

/** Accounts a captain or supervisor made that nobody has signed in to yet. */
export async function listUnclaimed(seasonId: string | null): Promise<PersonSummary[]> {
  const snap = await adminDb.collection(paths.users).where("claimedAt", "==", null).limit(LIST_LIMIT).get();
  return summaries(snap.docs.map((d) => ({ id: d.id, ...readUser(d.data()) })), seasonId);
}

async function summaries(users: WithId<UserDoc>[], seasonId: string | null): Promise<PersonSummary[]> {
  const players = seasonId ? await getPlayers(seasonId, users.map((u) => u.id)) : new Map<string, PlayerDoc>();
  return users
    .map((user) => summary(user, players.get(user.id)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function summary(user: WithId<UserDoc>, player: PlayerDoc | undefined): PersonSummary {
  return {
    userId: user.id,
    netid: user.netid,
    name: displayName(user),
    claimed: !!user.claimedAt,
    collegeId: player?.collegeId ?? null,
    inSeason: !!player,
  };
}

// ── One person ─────────────────────────────────────────────────────────────

/** A person's identity, season (college history, roles, captaincies), every game they're recorded on and their requests; null: no such user. */
export async function personView(userId: string, seasonId: string): Promise<Person | null> {
  const [userSnap, playerSnap, entrySnaps, teams, requests] = await Promise.all([
    userRef(userId).get(),
    playerRef(seasonId, userId).get(),
    playerEntriesQuery(seasonId, userId).get(),
    listCaptainTeams(seasonId, userId),
    listOwnRequests(userId),
  ]);
  if (!userSnap.exists) return null;
  const user = { id: userId, ...readUser(userSnap.data()!) };
  const player = playerSnap.data();
  const entries = entrySnaps.docs.map((d) => d.data());
  const games = await getMatches(seasonId, entries.map((e) => e.matchId));
  const review = underReview(player, entries);
  return {
    ...summary(user, player),
    email: user.email,
    nameSource: user.nameSource,
    createdBy: user.createdBy,
    roles: user.roles,
    revision: revisionOf(userSnap)!,
    seasonId,
    season: player
      ? {
          collegeHistory: toJson(player.collegeHistory ?? []),
          roles: player.roles,
          captainOf: teams.map(({ collegeId, sportId }) => ({ collegeId, sportId })),
          revision: revisionOf(playerSnap)!,
        }
      : null,
    games: entrySnaps.docs.map((snap, i) => {
      const e = entries[i];
      const game = games.get(e.matchId);
      return {
        matchId: e.matchId,
        startsAt: e.startsAt.toDate().toISOString(),
        sportId: e.sportId,
        homeCollegeId: game?.homeCollegeId ?? null,
        awayCollegeId: game?.awayCollegeId ?? null,
        collegeId: e.collegeId,
        addedBy: e.addedBy,
        captainStatus: e.captainStatus,
        present: e.present,
        underReview: review.has(e.matchId),
        confirmedByAdmin: !!e.attendanceConfirmedBy,
        revision: revisionOf(snap)!,
      };
    }),
    requests: requests.map((r) => ({ ...toOwnReview(r), revision: r.revision })),
  };
}

/** The games whose recorded attendance is under review (lib/attendance.ts), by match id. */
function underReview(player: PlayerDoc | undefined, entries: RosterEntryDoc[]): Set<string> {
  const attended = entries.filter((e) => e.present === true);
  const flags = disputed(
    player ? assignmentsOf(player) : [],
    attended.map((e) => ({ collegeId: e.collegeId, startsAt: e.startsAt.toMillis(), adminConfirmed: !!e.attendanceConfirmedBy }))
  );
  return new Set(attended.filter((_, i) => flags[i]).map((e) => e.matchId));
}

// ── Corrections ────────────────────────────────────────────────────────────

/**
 * An admin's name (locked: neither the directory nor the person replaces
 * it, D3b) and/or email for a person, or an admin-set name given back to
 * the person to change (D-N4); the current season's (`seasonId`) player doc
 * copies the name.
 */
export async function fixProfile(userId: string, fix: ProfileFix, seasonId: string, actor: Actor): Promise<"ok" | "not-found"> {
  return runTransaction(async (tx) => {
    const [userSnap, playerSnap] = await Promise.all([tx.get(userRef(userId)), tx.get(playerRef(seasonId, userId))]);
    if (!userSnap.exists) return "not-found";
    expectRevision(userSnap, fix.revision);
    tx.update(userSnap.ref, {
      ...(fix.name !== undefined ? { name: fix.name, nameSource: "admin" } : {}),
      ...(fix.unlockName ? { nameSource: readUser(userSnap.data()!).name ? "self" : "none" } : {}),
      ...(fix.email !== undefined ? { email: fix.email } : {}),
    });
    if (fix.name !== undefined && playerSnap.exists) tx.update(playerSnap.ref, { name: fix.name });
    // A global change: the current season's log.
    logAction(tx, seasonId, {
      actor,
      action: "fixProfile",
      params: { userId, name: fix.name, email: fix.email, unlockName: fix.unlockName, reason: fix.reason },
      changed: [userSnap, ...(playerSnap.exists ? [playerSnap] : [])],
    });
    return "ok";
  });
}

export type AttendanceFixResult = "ok" | "not-found" | "no-target" | "target-on-game";

/**
 * One game's entry of a person, as an admin corrects it: confirm (or take
 * back the confirmation of) attendance under review; remove the entry; or
 * move it to the person with `netid` (a mistyped NetID), keeping its side,
 * calls and attendance. The target must have an account (else add them from
 * the game's sheet); without a player doc this season they get one, unassigned.
 */
export async function fixAttendance(userId: string, matchId: string, fix: AttendanceFix, actor: Actor): Promise<AttendanceFixResult> {
  const { seasonId } = fix;
  const ref = rosterEntryRef(seasonId, matchId, userId);
  const targetId = fix.action === "reassign" ? ((await findUserByNetid(fix.netid))?.id ?? null) : null;
  if (fix.action === "reassign" && !targetId) return "no-target";

  return runTransaction(async (tx): Promise<AttendanceFixResult> => {
    const snap = await tx.get(ref);
    const entry = snap.data();
    if (!entry) return "not-found";
    expectRevision(snap, fix.revision);
    const log = { actor, params: { userId, matchId, ...fix } };

    if (fix.action === "confirm") {
      tx.update(ref, { attendanceConfirmedBy: fix.confirmed ? actor.userId : null });
      logAction(tx, seasonId, { ...log, action: "confirmAttendance", changed: [snap] });
      return "ok";
    }
    if (fix.action === "remove") {
      tx.delete(ref);
      logAction(tx, seasonId, { ...log, action: "removeRosterEntry", changed: [snap] });
      return "ok";
    }

    const target = targetId!;
    const targetRef = rosterEntryRef(seasonId, matchId, target);
    const [targetSnap, userSnap, playerSnap] = await Promise.all([
      tx.get(targetRef),
      tx.get(userRef(target)),
      tx.get(playerRef(seasonId, target)),
    ]);
    if (!userSnap.exists) return "no-target";
    if (targetSnap.exists) return "target-on-game";
    const name = displayName(readUser(userSnap.data()!));
    if (!playerSnap.exists) {
      tx.create(playerRef(seasonId, target), {
        seasonId, collegeId: null, collegeHistory: [], name, userId: target, roles: [],
        joinedAt: FieldValue.serverTimestamp(), joinedVia: "admin",
      });
    }
    // The person it was wrongly on loses it; the confirmation was about them.
    tx.create(targetRef, { ...entry, playerId: target, name, attendanceConfirmedBy: null });
    tx.delete(ref);
    logAction(tx, seasonId, {
      ...log,
      action: "reassignRosterEntry",
      changed: [snap],
      created: [targetRef, ...(playerSnap.exists ? [] : [playerRef(seasonId, target)])],
    });
    return "ok";
  });
}
