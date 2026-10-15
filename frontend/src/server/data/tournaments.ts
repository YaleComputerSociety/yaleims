// Tournaments: tournaments/seasons/{seasonId}/{tournamentId}.
import "server-only";
import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { TournamentDoc, WithId } from "@/types/firestore";

/** The tournament doc, for services that change it in a transaction. */
export function tournamentRef(
  seasonId: string,
  tournamentId: string
): DocumentReference<TournamentDoc> {
  return adminDb.doc(paths.tournament(seasonId, tournamentId)) as DocumentReference<TournamentDoc>;
}

/** A season's tournaments. `id` is the doc id (it wins over a stored `id` field). */
export async function listTournaments(
  seasonId: string
): Promise<WithId<TournamentDoc>[]> {
  const snap = await adminDb.collection(paths.tournaments(seasonId)).get();
  return snap.docs.map((d) => ({ ...(d.data() as TournamentDoc), id: d.id }));
}
