// Weekly MVPs: seasons/{seasonId}/colleges/{collegeId}/mvps/{awardId}, one
// doc per award (a college may name several MVPs in a week).
import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { MvpDoc, WithId } from "@/types/firestore";
import { withId } from "./util";

/** A college's MVP awards this season. */
export async function listCollegeMvps(seasonId: string, collegeId: string): Promise<WithId<MvpDoc>[]> {
  const snap = await mvpsRef(seasonId, collegeId).get();
  return snap.docs.map((d) => withId<MvpDoc>(d));
}

export function mvpsRef(seasonId: string, collegeId: string): CollectionReference<MvpDoc> {
  return adminDb.collection(paths.mvps(seasonId, collegeId)) as CollectionReference<MvpDoc>;
}
