// Sports: each season's lineup, seasons/{seasonId}/sports/{sportId}. Games
// reference a sport by id.
import "server-only";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { SportDoc, WithId } from "@/types/firestore";
import { withId } from "./util";

export async function listSports(seasonId: string): Promise<WithId<SportDoc>[]> {
  const snap = await adminDb.collection(paths.sports(seasonId)).get();
  return snap.docs.map((d) => withId<SportDoc>(d));
}

/** The season's sport with this id, or null. */
export async function getSport(seasonId: string, sportId: string): Promise<WithId<SportDoc> | null> {
  const snap = await adminDb.doc(paths.sport(seasonId, sportId)).get();
  return snap.exists ? withId<SportDoc>(snap) : null;
}
