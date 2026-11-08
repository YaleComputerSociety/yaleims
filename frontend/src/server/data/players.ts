// Season membership (D30): seasons/{seasonId}/players/{playerId}, created on
// a person's first login of the season (services/accounts) or when a captain
// or supervisor adds them. playerId = the account's user id, or a NetID not yet
// matched to an account ("netid-<netid>", a placeholder), or a guest ("guest-<random>").
import "server-only";
import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { PlayerDoc, SeasonRole, WithId } from "@/types/firestore";
import { withId } from "./util";

export function playerRef(seasonId: string, playerId: string): DocumentReference<PlayerDoc> {
  return adminDb.doc(paths.player(seasonId, playerId)) as DocumentReference<PlayerDoc>;
}

export async function getPlayer(seasonId: string, playerId: string): Promise<PlayerDoc | null> {
  const snap = await playerRef(seasonId, playerId).get();
  return snap.exists ? snap.data()! : null;
}

/** A college's players this season. */
export async function listCollegePlayers(
  seasonId: string,
  collegeId: string
): Promise<WithId<PlayerDoc>[]> {
  const snap = await adminDb
    .collection(paths.players(seasonId))
    .where("collegeId", "==", collegeId)
    .get();
  return snap.docs.map((d) => withId<PlayerDoc>(d));
}

/** A college's reps this season. */
export async function listCollegeReps(seasonId: string, collegeId: string): Promise<WithId<PlayerDoc>[]> {
  const snap = await adminDb
    .collection(paths.players(seasonId))
    .where("collegeId", "==", collegeId)
    .where("roles", "array-contains", "college_rep")
    .get();
  return snap.docs.map((d) => withId<PlayerDoc>(d));
}

/** Everyone holding a season role (e.g. the supervisors) this season. */
export async function listPlayersWithRole(seasonId: string, role: SeasonRole): Promise<WithId<PlayerDoc>[]> {
  const snap = await adminDb.collection(paths.players(seasonId)).where("roles", "array-contains", role).get();
  return snap.docs.map((d) => withId<PlayerDoc>(d));
}

/** These people's player docs this season (missing ones left out), by id; one batched read. */
export async function getPlayers(seasonId: string, playerIds: string[]): Promise<Map<string, PlayerDoc>> {
  if (playerIds.length === 0) return new Map();
  const snaps = await adminDb.getAll(...playerIds.map((id) => playerRef(seasonId, id)));
  return new Map(snaps.filter((s) => s.exists).map((s) => [s.id, s.data() as PlayerDoc]));
}
