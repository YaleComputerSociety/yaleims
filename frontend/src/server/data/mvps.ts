// Weekly MVPs: mvps/{seasonId}/{college}/{weekId}, each doc keyed by the MVP's email.
import "server-only";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";

/** One week's MVPs of a college, keyed by email. */
export type MvpWeekDoc = Record<string, { fname?: string; lname?: string }>;

/** A college's MVPs for a season, keyed by week id (e.g. "week_4"). */
export async function listCollegeMvps(
  seasonId: string,
  college: string
): Promise<Record<string, MvpWeekDoc>> {
  const snap = await adminDb.collection(paths.collegeMvps(seasonId, college)).get();
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as MvpWeekDoc]));
}

/** Adds (or replaces) one MVP in a college's week doc, keeping the others. */
export async function setCollegeMvp(
  seasonId: string,
  college: string,
  weekId: string,
  email: string,
  name: { fname: string; lname: string }
): Promise<void> {
  await adminDb
    .doc(paths.collegeMvp(seasonId, college, weekId))
    .set({ [email]: name }, { merge: true });
}
