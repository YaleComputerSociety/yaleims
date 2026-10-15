// Playoff brackets: brackets/seasons/{seasonId}/{sport}, one per sport. The
// games themselves are match docs; the bracket lists them by slot.
import "server-only";
import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { BracketDoc } from "@/types/firestore";

/** The bracket doc, for services that change it in a transaction. */
export function bracketRef(seasonId: string, sport: string): DocumentReference<BracketDoc> {
  return adminDb.doc(paths.bracket(seasonId, sport)) as DocumentReference<BracketDoc>;
}
