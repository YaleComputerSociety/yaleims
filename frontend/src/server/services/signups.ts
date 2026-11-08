// Game sign-ups (D34): a player with a college this season signs up for its
// games, until they start; withdrawing (same deadline; their own entry,
// whatever their college) deletes their roster entry. A captain's removal
// stays on the roster ("removed"), and the player can't sign up again; only
// a captain or supervisor can add them back. An entry on the other side
// (placed there while they were unassigned, or before an admin changed their
// college) moves to their college's side at sign-up (Execution brief "History").
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { logAction } from "../data/auditLog";
import { matchRef } from "../data/matches";
import { playerRef } from "../data/players";
import { rosterEntryRef } from "../data/roster";
import { runTransaction } from "../data/util";

export type SignUpResult =
  | "ok"
  | "no-match"
  | "not-in-season" // no player doc this season
  | "unassigned" // no college this season (account plan: signing yourself up needs one)
  | "other-college" // the player's college plays neither side
  | "started"
  | "cancelled"
  | "removed" // the captain took them off
  | "already-signed-up";

/** Puts the player on the game's roster, on their college's side (an entry on the other side moves there). */
export async function signUp(
  seasonId: string,
  matchId: string,
  playerId: string,
  now = new Date()
): Promise<SignUpResult> {
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
    if (!player.collegeId) return "unassigned";
    if (!match.collegeIds.includes(player.collegeId)) return "other-college";
    if (match.startsAt.toMillis() <= now.getTime()) return "started";
    if (match.status === "cancelled") return "cancelled";
    const entry = entrySnap.data();
    if (entry?.collegeId === player.collegeId) return entry.captainStatus === "removed" ? "removed" : "already-signed-up";
    if (entry) {
      // One entry per player and game: rewritten, logged as it was.
      logAction(tx, seasonId, {
        actor: { userId: playerId, roles: ["user"] },
        action: "signUpOnOwnSide",
        params: { matchId, playerId, from: entry.collegeId, to: player.collegeId },
        changed: [entrySnap],
      });
    }

    tx.set(entryRef, {
      seasonId,
      matchId,
      sportId: match.sportId,
      collegeId: player.collegeId,
      playerId,
      name: player.name,
      startsAt: match.startsAt,
      addedBy: "self",
      addedByUser: playerId,
      signedUpAt: FieldValue.serverTimestamp(),
      captainStatus: null,
      captainBy: null,
      captainAt: null,
      present: false,
      presentBy: null,
      presentAt: null,
    });
    return "ok";
  });
}

export type WithdrawResult = "ok" | "no-match" | "started" | "not-signed-up" | "removed";

/** Takes the player off the game's roster. */
export async function withdraw(
  seasonId: string,
  matchId: string,
  playerId: string,
  now = new Date()
): Promise<WithdrawResult> {
  const entryRef = rosterEntryRef(seasonId, matchId, playerId);
  return runTransaction(async (tx) => {
    const [matchSnap, entrySnap] = await Promise.all([tx.get(matchRef(seasonId, matchId)), tx.get(entryRef)]);
    const match = matchSnap.data();
    const entry = entrySnap.data();
    if (!match) return "no-match";
    if (!entry) return "not-signed-up";
    if (entry.captainStatus === "removed") return "removed";
    if (match.startsAt.toMillis() <= now.getTime()) return "started";
    tx.delete(entryRef);
    return "ok";
  });
}
