// The roster sheet: before a game, each team's
// captain prepares their college's side (confirm, remove, add players, by
// NetID too) until it starts; a supervisor marks who came and adds walk-ins,
// at any time. Who may act on which side is the route's check (server/auth.ts
// can.manageRoster, can.takeAttendance); the deadlines are here. A
// supervisor's change after the game's day (Eastern) is audit-logged (R5).
import "server-only";
import { FieldValue, type Transaction, type WithFieldValue } from "firebase-admin/firestore";
import { collegeIdOfName } from "@/lib/colleges";
import { easternDate } from "@/lib/dates";
import { placeholderId } from "@/lib/netid";
import type { CaptainStatus, MatchDoc, RosterEntryDoc } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { listColleges } from "../data/colleges";
import { matchRef } from "../data/matches";
import { playerRef } from "../data/players";
import { rosterEntryRef } from "../data/roster";
import { findUserByNetid } from "../data/users";
import { runTransaction } from "../data/util";
import { lookUpNetid } from "../directory";
import { claimPlaceholders, ensureAccount, joinSeason } from "./accounts";

/** Who acts: a supervisor (any time, may take attendance) or a captain (until the start). */
export interface SheetEditor {
  supervisor: boolean;
  actor: Actor;
}

const started = (match: MatchDoc, now: Date) => match.startsAt.toMillis() <= now.getTime();

/** A supervisor's change on a later day than the game's is logged (R5). */
function logIfLate(
  tx: Transaction,
  by: SheetEditor,
  match: MatchDoc,
  now: Date,
  entry: Parameters<typeof logAction>[2]
): void {
  if (by.supervisor && easternDate(now) > easternDate(match.startsAt.toDate())) logAction(tx, match.seasonId, entry);
}

// ── Changing an entry ──────────────────────────────────────────────────────

export interface EntryChange {
  /** The captain's call; null takes it back. */
  captainStatus?: CaptainStatus | null;
  /** Came to the game (supervisors). */
  present?: boolean;
}

export type ChangeResult = "ok" | "no-match" | "no-entry" | "started";

/** Changes the captain's call or the attendance of one player on a game. */
export async function changeEntry(
  seasonId: string,
  matchId: string,
  playerId: string,
  change: EntryChange,
  by: SheetEditor,
  now = new Date()
): Promise<ChangeResult> {
  const entryRef = rosterEntryRef(seasonId, matchId, playerId);
  return runTransaction(async (tx) => {
    const [matchSnap, entrySnap] = await Promise.all([tx.get(matchRef(seasonId, matchId)), tx.get(entryRef)]);
    const match = matchSnap.data();
    if (!match) return "no-match";
    if (!entrySnap.exists) return "no-entry";
    if (!by.supervisor && started(match, now)) return "started";

    tx.update(entryRef, {
      ...(change.captainStatus !== undefined
        ? { captainStatus: change.captainStatus, captainBy: by.actor.userId, captainAt: FieldValue.serverTimestamp() }
        : {}),
      ...(change.present !== undefined
        ? { present: change.present, presentBy: by.actor.userId, presentAt: FieldValue.serverTimestamp() }
        : {}),
    });
    logIfLate(tx, by, match, now, {
      actor: by.actor,
      action: "changeRosterEntry",
      params: { matchId, playerId, ...change },
      changed: [entrySnap],
    });
    return "ok";
  });
}

// ── Adding players ─────────────────────────────────────────────────────────

export type AddResult = "ok" | "no-match" | "not-in-season" | "other-college" | "started";

/**
 * Puts a season player on the game, on their college's side: a captain's
 * addition counts as confirmed, a supervisor's as present (a walk-in). A
 * player already on it (or taken off) is put back the same way.
 */
export async function addPlayer(
  seasonId: string,
  matchId: string,
  playerId: string,
  by: SheetEditor,
  now = new Date()
): Promise<AddResult> {
  const entryRef = rosterEntryRef(seasonId, matchId, playerId);
  return runTransaction(async (tx) => {
    const [matchSnap, playerSnap, entrySnap] = await Promise.all([
      tx.get(matchRef(seasonId, matchId)),
      tx.get(playerRef(seasonId, playerId)),
      tx.get(entryRef),
    ]);
    const match = matchSnap.data();
    const player = playerSnap.data();
    if (!match) return "no-match";
    if (!player) return "not-in-season";
    if (!player.collegeId || !match.collegeIds.includes(player.collegeId)) return "other-college";
    if (!by.supervisor && started(match, now)) return "started";

    const call = by.supervisor
      ? { present: true, presentBy: by.actor.userId, presentAt: FieldValue.serverTimestamp() }
      : { captainStatus: "confirmed" as const, captainBy: by.actor.userId, captainAt: FieldValue.serverTimestamp() };
    const entry = entrySnap.data();
    if (entry) {
      // Taken off before: the supervisor's or captain's addition overrides that.
      tx.update(entryRef, { ...(entry.captainStatus === "removed" ? { captainStatus: null } : {}), ...call });
    } else {
      tx.create(entryRef, { ...newEntry(match, matchId, playerId, player.collegeId, player.name, by), ...call });
    }
    logIfLate(tx, by, match, now, {
      actor: by.actor,
      action: "addRosterPlayer",
      params: { matchId, playerId },
      changed: entry ? [entrySnap] : [],
      created: entry ? [] : [entryRef],
    });
    return "ok";
  });
}

export type NetidAddResult =
  | { status: "added"; playerId: string; verified: boolean }
  | { status: "no-match" | "not-in-season" | "started" }
  /** Their college (Yalies, or their player doc this season) isn't the side's. */
  | { status: "other-college"; collegeId: string | null };

/**
 * Adds someone by NetID to `collegeId`'s side of a game (U10): the account
 * that has this NetID; else the person Yalies knows by it, whose account is
 * created for them (unclaimed) when they have none, if their college is the
 * side's; else, when Yalies doesn't know the NetID or can't be reached, a
 * placeholder player "netid-<netid>" on that side, matched to the real
 * account at that person's sign-in or a later lookup that finds them.
 */
export async function addByNetid(
  seasonId: string,
  matchId: string,
  collegeId: string,
  netid: string,
  name: string | null,
  by: SheetEditor,
  now = new Date()
): Promise<NetidAddResult> {
  const via = by.supervisor ? "supervisor" : "captain";
  const colleges = await listColleges(seasonId);
  // The directory down or not knowing them: the account we know, or a placeholder.
  const found = await lookUpNetid(netid);

  let playerId: string;
  let verified = true;
  if (found.person) {
    const directoryCollege = collegeIdOfName(colleges, found.person.college);
    if (directoryCollege !== collegeId) return { status: "other-college", collegeId: directoryCollege };
    const fullName = found.person.name ?? name ?? netid;
    playerId = await ensureAccount(found, netid, by.actor, seasonId);
    await claimPlaceholders(netid, playerId, fullName);
    await joinSeason(seasonId, playerId, fullName, collegeId, via);
  } else {
    const known = await findUserByNetid(netid);
    if (known) {
      await joinSeason(seasonId, known.id, known.name ?? netid, collegeId, via);
      playerId = known.id;
    } else {
      playerId = placeholderId(netid);
      verified = false;
      await joinSeason(seasonId, playerId, name || netid, collegeId, via);
    }
  }
  const result = await addPlayer(seasonId, matchId, playerId, by, now);
  if (result === "ok") return { status: "added", playerId, verified };
  if (result === "other-college") return { status: "other-college", collegeId: null };
  return { status: result };
}

/** A roster entry added by a captain or supervisor, before their call. */
function newEntry(
  match: MatchDoc,
  matchId: string,
  playerId: string,
  collegeId: string,
  name: string,
  by: SheetEditor
): WithFieldValue<RosterEntryDoc> {
  return {
    seasonId: match.seasonId,
    matchId,
    sportId: match.sportId,
    collegeId,
    playerId,
    name,
    startsAt: match.startsAt,
    addedBy: by.supervisor ? "supervisor" : "captain",
    addedByUser: by.actor.userId,
    signedUpAt: FieldValue.serverTimestamp(),
    captainStatus: null,
    captainBy: null,
    captainAt: null,
    present: false,
    presentBy: null,
    presentAt: null,
  };
}
