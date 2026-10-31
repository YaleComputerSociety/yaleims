// Teams: seasons/{seasonId}/colleges/{collegeId}/teams/{sportId}, a college's
// team in a sport: its captains and its record (scoring keeps the record).
// Created on first use.
import "server-only";
import type { CollectionReference, DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { collectionGroups, paths } from "@/lib/paths";
import type { TeamDoc } from "@/types/firestore";

export function teamRef(
  seasonId: string,
  collegeId: string,
  sportId: string
): DocumentReference<TeamDoc> {
  return adminDb.doc(paths.team(seasonId, collegeId, sportId)) as DocumentReference<TeamDoc>;
}

/** A college's teams collection, for services that read it in a transaction. */
export function collegeTeamsRef(seasonId: string, collegeId: string): CollectionReference<TeamDoc> {
  return adminDb.collection(paths.teams(seasonId, collegeId)) as CollectionReference<TeamDoc>;
}

/** A team with no captains and no games, for its first use. */
export function newTeam(seasonId: string, collegeId: string, sportId: string): TeamDoc {
  return {
    seasonId, collegeId, sportId, captainIds: [],
    games: 0, wins: 0, losses: 0, ties: 0, forfeits: 0, pointsFor: 0, pointsAgainst: 0,
  };
}

/** A college's teams this season. */
export async function listCollegeTeams(seasonId: string, collegeId: string): Promise<TeamDoc[]> {
  const snap = await collegeTeamsRef(seasonId, collegeId).get();
  return snap.docs.map((d) => d.data());
}

/** The teams a player captains this season. */
export async function listCaptainTeams(seasonId: string, playerId: string): Promise<TeamDoc[]> {
  // Across seasons (one collection-group index), then this season's.
  const snap = await adminDb
    .collectionGroup(collectionGroups.teams)
    .where("captainIds", "array-contains", playerId)
    .get();
  return snap.docs.map((d) => d.data() as TeamDoc).filter((t) => t.seasonId === seasonId);
}
