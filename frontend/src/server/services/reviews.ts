// Review requests (account plan, step 9; decision 3d): a person asks about
// their own college, a game's attendance or their name; an admin closes the
// request with an answer the person sees. One open request per person, kind,
// season and game (openKey), at most MAX_OPEN open per person. A deleted game
// closes the requests about it, in the deleting transaction.
import "server-only";
import { FieldValue, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { ApiError } from "@/lib/api/core";
import type { CloseReview, NewReview } from "@/lib/api/reviews";
import type { ReviewRequestDoc } from "@/types/firestore";
import { logAction, type Actor } from "../data/auditLog";
import { matchRef } from "../data/matches";
import { openKeyOf, reviewRequestRef, reviewRequestsRef } from "../data/reviewRequests";
import { expectRevision, runTransaction } from "../data/util";

/** Open requests one person may have at once. */
const MAX_OPEN = 5;

/** Files the caller's request; one about the same thing already open is returned instead. */
export async function createRequest(
  userId: string,
  seasonId: string,
  review: NewReview
): Promise<{ id: string; created: boolean }> {
  const fields = { subjectUserId: userId, kind: review.kind, seasonId, matchId: review.kind === "attendance" ? (review.matchId ?? null) : null };
  const openKey = openKeyOf(fields);
  return runTransaction(async (tx) => {
    const [same, open] = await Promise.all([
      tx.get(reviewRequestsRef().where("openKey", "==", openKey).limit(1)),
      tx.get(reviewRequestsRef().where("subjectUserId", "==", userId).where("status", "==", "open").limit(MAX_OPEN)),
    ]);
    if (!same.empty) return { id: same.docs[0].id, created: false };
    if (open.size >= MAX_OPEN) throw new ApiError("conflict", `You have ${MAX_OPEN} open requests: wait for an answer first.`);
    if (fields.matchId && !(await tx.get(matchRef(seasonId, fields.matchId))).exists) {
      throw new ApiError("not-found", "No such game this season.");
    }
    const ref = reviewRequestsRef().doc();
    tx.create(ref, {
      ...fields,
      message: review.message,
      status: "open",
      openKey,
      resolution: null,
      resolvedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      closedAt: null,
    });
    return { id: ref.id, created: true };
  });
}

/** Closes an open request with the admin's answer, unless it changed since `revision` (409). Audit-logged. */
export async function closeRequest(requestId: string, close: CloseReview, actor: Actor): Promise<"ok" | "not-found"> {
  const ref = reviewRequestRef(requestId);
  return runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const request = snap.data();
    if (!request) return "not-found";
    expectRevision(snap, close.revision);
    if (request.status !== "open") throw new ApiError("conflict", "This request is already closed.");
    tx.update(ref, { status: close.status, resolution: close.resolution, resolvedBy: actor.userId, openKey: null, closedAt: FieldValue.serverTimestamp() });
    logAction(tx, request.seasonId, { actor, action: "closeReviewRequest", params: { requestId, status: close.status }, changed: [snap] });
    return "ok";
  });
}

/** The open requests about these games, read in a deleting transaction (closeGameRequests writes). */
export async function readGameRequests(
  tx: Transaction,
  seasonId: string,
  matchIds: string[]
): Promise<QueryDocumentSnapshot<ReviewRequestDoc>[]> {
  const chunks = Array.from({ length: Math.ceil(matchIds.length / 30) }, (_, i) => matchIds.slice(i * 30, i * 30 + 30));
  const snaps = await Promise.all(
    chunks.map((ids) => tx.get(reviewRequestsRef().where("seasonId", "==", seasonId).where("matchId", "in", ids).where("status", "==", "open")))
  );
  return snaps.flatMap((s) => s.docs);
}

/** Closes the requests about deleted games, so none points at a game that is gone (account plan, step 11). */
export function closeGameRequests(tx: Transaction, requests: QueryDocumentSnapshot<ReviewRequestDoc>[], actor: Actor): void {
  for (const request of requests) {
    tx.update(request.ref, {
      status: "dismissed",
      resolution: "The game was deleted from the schedule.",
      resolvedBy: actor.userId,
      openKey: null,
      closedAt: FieldValue.serverTimestamp(),
    });
  }
}
