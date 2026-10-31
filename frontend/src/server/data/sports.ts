// Sports: each season's lineup, seasons/{seasonId}/sports/{sportId}. Match
// docs reference a sport by id; the API still speaks sport names
// (types/api.ts), so routes translate with these.
import "server-only";
import type { Transaction } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { legacyPaths, paths } from "@/lib/paths";
import type { SportDoc, WithId } from "@/types/firestore";
import { withId } from "./util";

export async function listSports(seasonId: string): Promise<WithId<SportDoc>[]> {
  const snap = await adminDb.collection(paths.sports(seasonId)).get();
  return snap.docs.map((d) => withId<SportDoc>(d));
}

/** The season's sport named `name`, or null. */
export async function findSportByName(
  seasonId: string,
  name: string
): Promise<WithId<SportDoc> | null> {
  const snap = await adminDb.collection(paths.sports(seasonId)).where("name", "==", name).limit(1).get();
  return snap.empty ? null : withId<SportDoc>(snap.docs[0]);
}

/**
 * Pre-v3: points_for_win of the top-level sport named `name` (0 if unset);
 * throws if none has that name. Goes when scoring moves to v3 (matches carry
 * pointsForWin).
 */
export async function getPointsForWin(name: string, tx?: Transaction): Promise<number> {
  const query = adminDb.collection(legacyPaths.sports).where("name", "==", name);
  const snap = tx ? await tx.get(query) : await query.get();
  if (snap.empty) {
    throw new Error(`No sport found with the name: ${name}`);
  }
  return snap.docs[0].data().points_for_win || 0;
}
