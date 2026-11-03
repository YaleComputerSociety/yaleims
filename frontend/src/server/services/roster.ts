// The roster sheet (D34, U5-ROSTER-WORKFLOW.md): before a game, each team's
// captain prepares their college's side (confirm, remove, add players) until
// it starts; a supervisor marks who came and adds walk-ins and guests, at
// any time. Who may act on which side is the route's check (server/auth.ts
// can.manageRoster, can.takeAttendance); the deadlines are here. A
// supervisor's change after the game's day (Eastern) is audit-logged (R5).
import "server-only";
import { randomBytes } from "node:crypto";
import { FieldValue, type Transaction, type WithFieldValue } from "firebase-admin/firestore";
import { easternDate } from "@/lib/dates";
import type { CaptainStatus, MatchDoc, RosterEntryDoc } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { matchRef } from "../data/matches";
import { playerRef } from "../data/players";
import { rosterEntryRef } from "../data/roster";
import { runTransaction } from "../data/util";

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

export type GuestResult = { status: "ok"; playerId: string } | { status: "no-match" | "other-college" };

/**
 * Adds someone who has no account as a name-only guest player of `collegeId`
 * this season (playerId "guest-<random>"), present at the game (supervisors).
 */
export async function addGuest(
  seasonId: string,
  matchId: string,
  collegeId: string,
  name: string,
  by: SheetEditor,
  now = new Date()
): Promise<GuestResult> {
  const playerId = `guest-${randomBytes(6).toString("hex")}`;
  const entryRef = rosterEntryRef(seasonId, matchId, playerId);
  return runTransaction(async (tx) => {
    const match = (await tx.get(matchRef(seasonId, matchId))).data();
    if (!match) return { status: "no-match" };
    if (!match.collegeIds.includes(collegeId)) return { status: "other-college" };

    tx.create(playerRef(seasonId, playerId), {
      seasonId,
      collegeId,
      name,
      userId: null,
      roles: [],
      joinedAt: FieldValue.serverTimestamp(),
      joinedVia: "supervisor",
    });
    tx.create(entryRef, {
      ...newEntry(match, matchId, playerId, collegeId, name, by),
      present: true,
      presentBy: by.actor.userId,
      presentAt: FieldValue.serverTimestamp(),
    });
    logIfLate(tx, by, match, now, {
      actor: by.actor,
      action: "addRosterGuest",
      params: { matchId, collegeId, name },
      changed: [],
      created: [playerRef(seasonId, playerId), entryRef],
    });
    return { status: "ok", playerId };
  });
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
