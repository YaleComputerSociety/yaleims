// Game sign-ups (D34): a player signs up for a game of their own college,
// until it starts; withdrawing (same deadline) deletes their roster entry. A
// captain's removal stays on the roster ("removed"), and the player can't
// sign up again; only a captain or supervisor can add them back.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { matchRef } from "../data/matches";
import { playerRef } from "../data/players";
import { rosterEntryRef } from "../data/roster";
import { runTransaction } from "../data/util";

export type SignUpResult =
  | "ok"
  | "no-match"
  | "not-in-season" // no player doc this season
  | "other-college" // the player's college plays neither side
  | "started"
  | "removed" // the captain took them off
  | "already-signed-up";

/** Puts the player on the game's roster, on their college's side. */
export async function signUp(
  seasonId: string,
  matchId: string,
  email: string,
  now = new Date()
): Promise<SignUpResult> {
  const entryRef = rosterEntryRef(seasonId, matchId, email);
  return runTransaction(async (tx) => {
    const [matchSnap, playerSnap, entrySnap] = await Promise.all([
      tx.get(matchRef(seasonId, matchId)),
      tx.get(playerRef(seasonId, email)),
      tx.get(entryRef),
    ]);
    const match = matchSnap.data();
    const player = playerSnap.data();
    if (!match) return "no-match";
    if (!player) return "not-in-season";
    if (!player.collegeId || !match.collegeIds.includes(player.collegeId)) return "other-college";
    if (match.startsAt.toMillis() <= now.getTime()) return "started";
    const entry = entrySnap.data();
    if (entry) return entry.captainStatus === "removed" ? "removed" : "already-signed-up";

    tx.create(entryRef, {
      seasonId,
      matchId,
      sportId: match.sportId,
      collegeId: player.collegeId,
      playerId: email,
      name: player.name,
      startsAt: match.startsAt,
      addedBy: "self",
      addedByUser: email,
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
  email: string,
  now = new Date()
): Promise<WithdrawResult> {
  const entryRef = rosterEntryRef(seasonId, matchId, email);
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
