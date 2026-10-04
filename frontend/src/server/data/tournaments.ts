// Tournaments: tournaments/seasons/{seasonId}/{tournamentId}.
import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { WithId } from "./util";

/** One slot of a tournament's bracket; the match itself is a match doc. */
export interface TournamentMatchEntry {
  match_id: number | string;
  timestamp?: Timestamp;
  [field: string]: unknown;
}

export interface TournamentDoc {
  name: string;
  sport: string;
  season: string;
  createdAt?: Timestamp;
  matches?: TournamentMatchEntry[];
  [field: string]: unknown;
}

/** A season's tournaments. `id` is the doc id (it wins over a stored `id` field). */
export async function listTournaments(
  seasonId: string
): Promise<WithId<TournamentDoc>[]> {
  const snap = await adminDb.collection(paths.tournaments(seasonId)).get();
  return snap.docs.map((d) => ({ ...(d.data() as TournamentDoc), id: d.id }));
}
