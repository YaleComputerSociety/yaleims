// Seasons: seasons/current (the active season + championship banner) and
// seasons/past ({ years }).
import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";

/** Sets the champion banner on the current season. */
export async function setChampionship(
  winningCollegeId: string | null,
  celebrationActive: boolean
): Promise<void> {
  await adminDb.doc(paths.currentSeason).set(
    {
      winningCollegeId,
      celebrationActive,
      championshipUpdatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/** seasons/current. */
export interface CurrentSeasonDoc {
  /** The season id, e.g. "2026-2027". */
  year: string;
  /** "fall" | "winter" | "spring". */
  season: string;
  winningCollegeId?: string | null;
  celebrationActive?: boolean;
  championshipUpdatedAt?: Timestamp;
}

export async function getCurrentSeason(): Promise<CurrentSeasonDoc | null> {
  const snap = await adminDb.doc(paths.currentSeason).get();
  return snap.exists ? (snap.data() as CurrentSeasonDoc) : null;
}

/** Ids of past seasons (seasons/past.years), or null if the doc is missing. */
export async function getPastSeasonIds(): Promise<string[] | null> {
  const snap = await adminDb.doc(paths.pastSeasons).get();
  if (!snap.exists) return null;
  const years = snap.data()?.years;
  return Array.isArray(years) ? years.filter((y) => typeof y === "string") : [];
}
