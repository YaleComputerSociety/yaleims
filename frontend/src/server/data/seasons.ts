// Seasons: config/app (which season is current, plus feature switches) and
// the season docs seasons/{seasonId}.
import "server-only";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { AppConfigDoc, SeasonDoc, WithId } from "@/types/firestore";
import { logAction, type Actor } from "./auditLog";
import { withId } from "./util";

export async function getAppConfig(): Promise<AppConfigDoc | null> {
  const snap = await adminDb.doc(paths.appConfig).get();
  return snap.exists ? (snap.data() as AppConfigDoc) : null;
}

/** The current season's id, or null if config/app is missing. */
export async function getCurrentSeasonId(): Promise<string | null> {
  return (await getAppConfig())?.currentSeasonId ?? null;
}

export function seasonRef(seasonId: string): DocumentReference<SeasonDoc> {
  return adminDb.doc(paths.season(seasonId)) as DocumentReference<SeasonDoc>;
}

/**
 * Every season, oldest first. The collection also holds the frozen pre-v3
 * docs "current" and "past"; ordering by startYear leaves them out.
 */
export async function listSeasons(): Promise<WithId<SeasonDoc>[]> {
  const snap = await adminDb.collection(paths.seasons).orderBy("startYear").get();
  return snap.docs.map((d) => withId<SeasonDoc>(d));
}

/** Sets the champion banner of a season (audit-logged). False if the season doesn't exist. */
export async function setChampionship(
  seasonId: string,
  change: { championCollegeId: string | null; celebrationActive: boolean },
  actor: Actor
): Promise<boolean> {
  const ref = seasonRef(seasonId);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    tx.update(ref, { ...change, championshipUpdatedAt: FieldValue.serverTimestamp() });
    logAction(tx, seasonId, { actor, action: "setChampion", params: change, changed: [snap] });
    return true;
  });
}
