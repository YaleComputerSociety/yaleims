// Review requests: reviewRequests/{requestId}, a person's private request
// for an admin to look at their college, a game's attendance or their name
// (services/reviews.ts). Server-only.
import "server-only";
import type { CollectionReference, DocumentReference, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin";
import { paths } from "@/lib/paths";
import type { ReviewRequestDoc, ReviewStatus, WithId } from "@/types/firestore";
import { revisionOf, withId } from "./util";

export function reviewRequestsRef(): CollectionReference<ReviewRequestDoc> {
  return adminDb.collection(paths.reviewRequests) as CollectionReference<ReviewRequestDoc>;
}

export function reviewRequestRef(requestId: string): DocumentReference<ReviewRequestDoc> {
  return reviewRequestsRef().doc(requestId);
}

/** The key an open request holds (openKey): one open request per person, kind, season and game. */
export const openKeyOf = (r: Pick<ReviewRequestDoc, "subjectUserId" | "kind" | "seasonId" | "matchId">) =>
  [r.subjectUserId, r.kind, r.seasonId, r.matchId ?? "-"].join("|");

/** A request with its id and revision (data/util.ts revisionOf). */
export type StoredReview = WithId<ReviewRequestDoc> & { revision: string };

const stored = (snap: QueryDocumentSnapshot<ReviewRequestDoc>): StoredReview => ({ ...withId<ReviewRequestDoc>(snap), revision: revisionOf(snap)! });

/** A person's requests, newest first (a few per person: sorted here, no index). */
export async function listOwnRequests(userId: string): Promise<StoredReview[]> {
  const snap = await reviewRequestsRef().where("subjectUserId", "==", userId).get();
  return snap.docs.map(stored).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

/** The admins' queue: requests with this status, newest first, at most `limit` (one index: status, createdAt). */
export async function listRequests(status: ReviewStatus, limit: number): Promise<StoredReview[]> {
  const snap = await reviewRequestsRef().where("status", "==", status).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map(stored);
}
