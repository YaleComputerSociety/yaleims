// Sports: each season's lineup, seasons/{seasonId}/sports/{sportId}. Match
// docs reference a sport by id; the API still speaks sport names
// (types/api.ts), so routes translate with these.
import "server-only";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
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
