// The roster sheet: before a game, each team's captains prepare their
// college's side (pre-confirm, take off, add players, by NetID too) until it
// starts; a supervisor confirms who came (the final word: the only attendance
// that counts), takes players off or puts them back, and adds walk-ins, at
// any time. One person may be both. Who may act on which side is the route's
// check (server/auth.ts can.prepareRoster, can.takeAttendance), read again in
// an add's transaction (rosterRolesIn); the deadlines are here. A
// supervisor's change after the game's day (Eastern) is audit-logged (R5).
import "server-only";
import { FieldValue, type Transaction, type WithFieldValue } from "firebase-admin/firestore";
import { ApiError } from "@/lib/api/core";
import { collegeIdOfName, collegeName } from "@/lib/colleges";
import { easternDate } from "@/lib/dates";
import { placeholderId } from "@/lib/netid";
import type { CaptainStatus, MatchDoc, RosterEntryDoc } from "@/types/firestore";
import { rosterRolesIn } from "../auth";
import { logAction, type Actor } from "../data/auditLog";
import { listColleges } from "../data/colleges";
import { getMatch, matchRef } from "../data/matches";
import { playerRef } from "../data/players";
import { rosterEntryRef } from "../data/roster";
import { getCurrentSeasonId } from "../data/seasons";
import { displayName, getUser } from "../data/users";
import { runTransaction } from "../data/util";
import { lookUpNetid } from "../directory";
import { claimPlaceholders, collegeAfterLookup, readAccount, writeAccount, writeSeasonPlayer } from "./accounts";

/**
 * Who acts, as what: a supervisor (attendance at any time, before the start
 * too; may take a player off or put them back, never pre-confirm: that is
 * the captains' call) and/or a captain of the side's team (pre-confirm, take
 * off, add, until the start).
 */
export interface SheetEditor {
  supervisor: boolean;
  captain: boolean;
  actor: Actor;
}

/** Whether `by` acts as the side's captain now: a captain, before the start (after it, only as a supervisor). */
const asCaptain = (by: SheetEditor, match: MatchDoc, now: Date) => by.captain && !started(match, now);

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

export type ChangeResult = "ok" | "no-match" | "no-entry" | "started" | "captains-only";

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
    // Pre-confirming, or taking a pre-confirmation back: the captains', until the start.
    const preConfirming = change.captainStatus === "confirmed" || (change.captainStatus === null && entrySnap.data()!.captainStatus === "confirmed");
    if (preConfirming && !by.captain) return "captains-only";
    if (preConfirming && !asCaptain(by, match, now)) return "started";

    tx.update(entryRef, {
      ...(change.captainStatus !== undefined
        ? {
            captainStatus: change.captainStatus,
            captainBy: by.actor.userId,
            captainByRole: asCaptain(by, match, now) ? ("captain" as const) : ("supervisor" as const),
            captainAt: FieldValue.serverTimestamp(),
          }
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

/** Whom to add: a season player by id, or a person by NetID (U10; `name` labels one the directory can't name). */
export type Addee = { playerId: string } | { netid: string; name: string | null };

export type AddResult =
  /** verified: the directory knows them, or they have an account. */
  | { status: "added"; playerId: string; verified: boolean }
  | { status: "no-match" | "not-in-game" | "not-in-season" | "forbidden" | "cancelled" | "started" }
  /** Their college (this season's, or the directory's) isn't the side's. */
  | { status: "other-college"; collegeId: string };

/**
 * Puts someone on `side` (a college) of a game: a captain's addition counts
 * as pre-confirmed (until the start), a supervisor's as present (a walk-in;
 * someone who is both adds as the captain until the start). A player already
 * on it (or taken off) is put back the same way.
 *
 * Rule 4a: a person with a college this season (or whose college the
 * directory names) goes on that college's side only; an unassigned one on
 * any side the caller manages, for this game only: a side never sets a
 * college.
 *
 * R06: the cheap checks first, then (by NetID) the directory lookup, then
 * one transaction that reads the game, the caller's role, the time and the
 * person again, and only then writes the person's account (readAccount:
 * made unclaimed when they have none), season player doc and entry
 * together. A refused add writes nothing. When the directory has linked
 * the NetID to an older account, a leftover netid- account is folded into
 * it after (claimPlaceholders).
 */
export async function addToGame(
  seasonId: string,
  matchId: string,
  side: string,
  who: Addee,
  actor: Actor
): Promise<AddResult> {
  const match = await getMatch(seasonId, matchId);
  if (!match) return { status: "no-match" };
  if (!match.collegeIds.includes(side)) return { status: "not-in-game" };
  const [colleges, currentSeasonId] = await Promise.all([listColleges(seasonId), getCurrentSeasonId()]);
  const byNetid = "netid" in who ? { ...who, found: await lookUpNetid(who.netid) } : null;
  const directoryCollege = collegeIdOfName(colleges, byNetid?.found.person?.college);

  const result = await runTransaction(async (tx): Promise<AddResult> => {
    const now = new Date();
    const game = (await tx.get(matchRef(seasonId, matchId))).data();
    if (!game) return { status: "no-match" };
    if (!game.collegeIds.includes(side)) return { status: "not-in-game" };
    const roles = await rosterRolesIn(tx, currentSeasonId, actor.userId, { seasonId, collegeId: side, sportId: game.sportId });
    if (!roles.supervisor && !roles.captain) return { status: "forbidden" };
    if (game.status === "cancelled") return { status: "cancelled" };
    if (!roles.supervisor && started(game, now)) return { status: "started" };
    const by: SheetEditor = { ...roles, actor };
    const captainAdds = asCaptain(by, game, now);

    const account = byNetid && (await readAccount(tx, byNetid.netid, byNetid.found));
    const playerId = byNetid ? (account?.existing?.id ?? placeholderId(byNetid.netid)) : (who as { playerId: string }).playerId;
    const entryRef = rosterEntryRef(seasonId, matchId, playerId);
    const [playerSnap, entrySnap] = await Promise.all([tx.get(playerRef(seasonId, playerId)), tx.get(entryRef)]);
    const player = playerSnap.data();
    if (!byNetid && !player) return { status: "not-in-season" };
    const collegeId = byNetid ? collegeAfterLookup(player, directoryCollege) : player!.collegeId;
    if (collegeId && collegeId !== side) return { status: "other-college", collegeId };

    let name = player?.name ?? "";
    if (byNetid && account) {
      // A label typed for someone the directory can't name becomes their unverified name (D-N3).
      name = writeAccount(tx, account, byNetid.found, { by: actor, seasonId, label: byNetid.name }).name;
      writeSeasonPlayer(tx, seasonId, playerId, player, directoryCollege, { name, joinedVia: captainAdds ? "captain" : "supervisor" });
    }
    const call = captainAdds
      ? { captainStatus: "confirmed" as const, captainBy: actor.userId, captainByRole: "captain" as const, captainAt: FieldValue.serverTimestamp() }
      : { present: true, presentBy: actor.userId, presentAt: FieldValue.serverTimestamp() };
    const entry = entrySnap.data();
    if (entry) {
      // Taken off before: the supervisor's or captain's addition overrides that.
      tx.update(entryRef, { ...(entry.captainStatus === "removed" ? { captainStatus: null } : {}), ...call });
    } else {
      tx.create(entryRef, { ...newEntry(game, matchId, playerId, side, name, captainAdds, actor), ...call });
    }
    logIfLate(tx, by, game, now, {
      actor,
      action: "addRosterPlayer",
      params: { matchId, playerId, side },
      changed: entry ? [entrySnap] : [],
      created: entry ? [] : [entryRef],
    });
    return { status: "added", playerId, verified: !byNetid || !!byNetid.found.person || !!account?.existing };
  });
  // The directory now links the NetID to an older account: what a leftover netid- account holds moves onto it.
  if (byNetid && result.status === "added" && result.playerId !== placeholderId(byNetid.netid)) {
    const leftover = await getUser(placeholderId(byNetid.netid));
    const user = leftover && (await getUser(result.playerId));
    if (user) await claimPlaceholders(byNetid.netid, result.playerId, displayName(user));
  }
  return result;
}

/** A refused add as the API's error (one wording for both add routes); an added one as is. */
export function throwIfRefused(result: AddResult): Extract<AddResult, { status: "added" }> {
  switch (result.status) {
    case "added":
      return result;
    case "no-match":
      throw new ApiError("not-found", "No such game this season.");
    case "not-in-game":
      throw new ApiError("conflict", "That college doesn't play in this game.");
    case "not-in-season":
      throw new ApiError("not-found", "They aren't a player this season.");
    case "forbidden":
      throw new ApiError("forbidden", "You don't have permission to do this.");
    case "cancelled":
      throw new ApiError("conflict", "This game is cancelled.");
    case "started":
      throw new ApiError("conflict", "The game has started: only a supervisor can change its roster now.");
    case "other-college":
      throw new ApiError("conflict", `They're in ${collegeName(result.collegeId)} this season, not on this side.`);
  }
}

/** A roster entry added by a captain or supervisor, before their call. */
function newEntry(
  match: MatchDoc,
  matchId: string,
  playerId: string,
  collegeId: string,
  name: string,
  byCaptain: boolean,
  actor: Actor
): WithFieldValue<RosterEntryDoc> {
  return {
    seasonId: match.seasonId,
    matchId,
    sportId: match.sportId,
    collegeId,
    playerId,
    name,
    startsAt: match.startsAt,
    addedBy: byCaptain ? "captain" : "supervisor",
    addedByUser: actor.userId,
    signedUpAt: FieldValue.serverTimestamp(),
    captainStatus: null,
    captainBy: null,
    captainByRole: null,
    captainAt: null,
    present: false,
    presentBy: null,
    presentAt: null,
  };
}
