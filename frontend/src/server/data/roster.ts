// Rosters: seasons/{seasonId}/matches/{matchId}/roster/{playerId}, one doc
// per player on a game: the sign-up, the captain's call and attendance (D34).
// Each entry also stores the season, game, sport and start (derived), so
// "a player's games" is one collection-group query.
import "server-only";
import type { CollectionReference, DocumentReference, Query } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { collectionGroups, paths } from "@/lib/paths";
import type { RosterEntryDoc } from "@/types/firestore";

export function rosterEntryRef(
  seasonId: string,
  matchId: string,
  playerId: string
): DocumentReference<RosterEntryDoc> {
  return adminDb.doc(paths.rosterEntry(seasonId, matchId, playerId)) as DocumentReference<RosterEntryDoc>;
}

/** A game's roster, for services that read it in a transaction. */
export function rosterRef(seasonId: string, matchId: string): CollectionReference<RosterEntryDoc> {
  return adminDb.collection(paths.roster(seasonId, matchId)) as CollectionReference<RosterEntryDoc>;
}

export async function getRosterEntry(seasonId: string, matchId: string, playerId: string): Promise<RosterEntryDoc | null> {
  const snap = await rosterEntryRef(seasonId, matchId, playerId).get();
  return snap.exists ? snap.data()! : null;
}

/** Sign-up order: entries that recorded it first, then (old entries) by name. */
function bySignup(a: RosterEntryDoc, b: RosterEntryDoc): number {
  const at = (e: RosterEntryDoc) => e.signedUpAt?.toMillis() ?? -1;
  return at(a) - at(b) || a.name.localeCompare(b.name);
}

export async function listRoster(seasonId: string, matchId: string): Promise<RosterEntryDoc[]> {
  const snap = await rosterRef(seasonId, matchId).get();
  return snap.docs.map((d) => d.data()).sort(bySignup);
}

/** A player's roster entries in a season, by the game's start (one collection-group index). */
export function playerEntriesQuery(seasonId: string, playerId: string): Query<RosterEntryDoc> {
  return adminDb
    .collectionGroup(collectionGroups.roster)
    .where("seasonId", "==", seasonId)
    .where("playerId", "==", playerId)
    .orderBy("startsAt") as Query<RosterEntryDoc>;
}

export async function listPlayerEntries(seasonId: string, playerId: string): Promise<RosterEntryDoc[]> {
  return (await playerEntriesQuery(seasonId, playerId).get()).docs.map((d) => d.data());
}
