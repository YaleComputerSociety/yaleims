// Weekly MVPs: seasons/{seasonId}/colleges/{collegeId}/mvps/{awardId}, one
// doc per award (a college may name several MVPs in a week).
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { MvpDoc, WithId } from "@/types/firestore";
import { withId } from "./util";

/** A college's MVP awards this season. */
export async function listCollegeMvps(seasonId: string, collegeId: string): Promise<WithId<MvpDoc>[]> {
  const snap = await adminDb.collection(paths.mvps(seasonId, collegeId)).get();
  return snap.docs.map((d) => withId<MvpDoc>(d));
}

/** Names a week's MVP of a college; naming the same player again for that week updates the award. */
export async function setMvp(
  seasonId: string,
  collegeId: string,
  award: Pick<MvpDoc, "week" | "playerId" | "name" | "awardedBy">
): Promise<void> {
  const awards = adminDb.collection(paths.mvps(seasonId, collegeId));
  await adminDb.runTransaction(async (tx) => {
    const existing = await tx.get(
      awards.where("week", "==", award.week).where("playerId", "==", award.playerId).limit(1)
    );
    const fields = { ...award, awardedAt: FieldValue.serverTimestamp() };
    if (existing.empty) tx.create(awards.doc(), { seasonId, collegeId, ...fields });
    else tx.update(existing.docs[0].ref, fields);
  });
}
