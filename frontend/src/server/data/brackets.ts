// Playoff brackets: brackets/seasons/{seasonId}/{sport}, one per sport. The
// games themselves are match docs; the bracket lists them by slot.
import "server-only";
import type { DocumentReference, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";

/** One slot of a bracket (also the shape of a tournament's slots). */
export interface BracketEntry {
  bracket_placement: number;
  round: string;
  match_id: number;
  timestamp: Timestamp;
}

export interface BracketDoc {
  sport: string;
  createdAt?: Timestamp;
  matches?: BracketEntry[];
}

/** The bracket doc, for services that change it in a transaction. */
export function bracketRef(seasonId: string, sport: string): DocumentReference<BracketDoc> {
  return adminDb.doc(paths.bracket(seasonId, sport)) as DocumentReference<BracketDoc>;
}
