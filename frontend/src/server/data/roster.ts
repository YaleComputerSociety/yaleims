// Rosters: seasons/{seasonId}/matches/{matchId}/roster/{playerId}, one doc
// per player on a game: the sign-up, the captain's call and attendance (D34).
// Each entry also stores the season, game, sport and start (derived), so
// "a player's games" is one collection-group query.
import "server-only";
import type { CollectionReference, DocumentReference } from "firebase-admin/firestore";
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

/** Sign-up order: entries that recorded it first, then (old entries) by name. */
function bySignup(a: RosterEntryDoc, b: RosterEntryDoc): number {
  const at = (e: RosterEntryDoc) => e.signedUpAt?.toMillis() ?? -1;
  return at(a) - at(b) || a.name.localeCompare(b.name);
}

export async function listRoster(seasonId: string, matchId: string): Promise<RosterEntryDoc[]> {
  const snap = await rosterRef(seasonId, matchId).get();
  return snap.docs.map((d) => d.data()).sort(bySignup);
}

/** The rosters of several games of a season, by game id (30 games per query). */
export async function listRosters(
  seasonId: string,
  matchIds: string[]
): Promise<Map<string, RosterEntryDoc[]>> {
  const rosters = new Map<string, RosterEntryDoc[]>(matchIds.map((id) => [id, []]));
  for (let i = 0; i < matchIds.length; i += 30) {
    const snap = await adminDb
      .collectionGroup(collectionGroups.roster)
      .where("matchId", "in", matchIds.slice(i, i + 30))
      .get();
    for (const d of snap.docs) {
      const entry = d.data() as RosterEntryDoc;
      if (entry.seasonId === seasonId) rosters.get(entry.matchId)?.push(entry);
    }
  }
  for (const roster of rosters.values()) roster.sort(bySignup);
  return rosters;
}

/** A player's roster entries in a season, by the game's start. */
export async function listPlayerEntries(seasonId: string, playerId: string): Promise<RosterEntryDoc[]> {
  const snap = await adminDb
    .collectionGroup(collectionGroups.roster)
    .where("playerId", "==", playerId)
    .get();
  return snap.docs
    .map((d) => d.data() as RosterEntryDoc)
    .filter((e) => e.seasonId === seasonId)
    .sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());
}
