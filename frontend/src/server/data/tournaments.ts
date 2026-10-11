// Tournaments: tournaments/seasons/{seasonId}/{tournamentId}.
import "server-only";
import type { DocumentReference, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { BracketEntry } from "./brackets";
import type { WithId } from "./util";


/** Colleges awarded each placement bonus (null once reversed). */
export interface TournamentPlacements {
  first?: string | null;
  second?: string | null;
  third?: string | null;
}

export interface TournamentDoc {
  name: string;
  sport: string;
  season: string;
  createdAt?: Timestamp;
  /** Its 16 slots, shaped like a bracket's; the games are match docs. */
  matches?: BracketEntry[];
  /** Bonus points per placement; missing or invalid values use the defaults. */
  placement_points?: unknown;
  placements?: TournamentPlacements;
  [field: string]: unknown;
}

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
