// Seasons: seasons/current (the active season + championship banner) and
// seasons/past ({ years }).
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
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
