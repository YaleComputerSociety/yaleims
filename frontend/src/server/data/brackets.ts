// Brackets: seasons/{seasonId}/brackets/{bracketId}, a sport's playoffs or a
// tournament (D28, P6). The games are ordinary matches (stage "playoff",
// bracketId); a bye is a slot with a college and no game. Ids: lib/brackets.ts.
import "server-only";
import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { BracketDoc, BracketKind, WithId } from "@/types/firestore";
import { withId } from "./util";

export function bracketRef(seasonId: string, id: string): DocumentReference<BracketDoc> {
  return adminDb.doc(paths.bracket(seasonId, id)) as DocumentReference<BracketDoc>;
}

export async function getBracket(seasonId: string, id: string): Promise<BracketDoc | null> {
  const snap = await bracketRef(seasonId, id).get();
  return snap.exists ? snap.data()! : null;
}

/** A season's brackets, optionally of one kind. */
export async function listBrackets(seasonId: string, kind?: BracketKind): Promise<WithId<BracketDoc>[]> {
  let query: FirebaseFirestore.Query = adminDb.collection(paths.brackets(seasonId));
  if (kind) query = query.where("kind", "==", kind);
  return (await query.get()).docs.map((d) => withId<BracketDoc>(d));
}
