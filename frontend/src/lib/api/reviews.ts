// The review-request API (account plan, step 9): a person asks an admin to
// look at their college, a game's attendance (a game they're missing from
// too) or their name (/api/me/review-requests); admins see the queue and
// answer (/api/review-requests, …/{requestId}). Private: only the person and
// admins see a request.
import { z } from "zod";
import type { ReviewKind, ReviewRequestDoc, ReviewStatus } from "@/types/firestore";
import { request, toJson, url, type Json } from "./core";
import type { Identity } from "./users";

const message = z
  .string()
  .trim()
  .min(1, "Say what should be checked.")
  .max(500, "Keep it under 500 characters.")
  .regex(/^[^\p{Cc}<>]+$/u, "A message can't contain < > or control characters.");

/** POST /api/me/review-requests: about the caller, this season. */
export const newReviewSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("affiliation"), message }),
  /** No matchId: a game they're not listed on, described in the message. */
  z.strictObject({ kind: z.literal("attendance"), matchId: z.string().trim().min(1).max(64).optional(), message }),
  z.strictObject({ kind: z.literal("profile"), message }),
]);
export type NewReview = z.infer<typeof newReviewSchema>;

/** A request as its person sees it. */
export type OwnReview = Json<Pick<ReviewRequestDoc, "kind" | "seasonId" | "matchId" | "message" | "status" | "resolution" | "createdAt" | "closedAt">> & {
  id: string;
};

/** A stored request as its person sees it (no openKey, no admin id). */
export function toOwnReview(r: ReviewRequestDoc & { id: string }): OwnReview {
  const { id, kind, seasonId, matchId, message, status, resolution, createdAt, closedAt } = r;
  return toJson({ id, kind, seasonId, matchId, message, status, resolution, createdAt, closedAt });
}

export interface OwnReviewList {
  items: OwnReview[];
  total: number;
}

/** POST answers 201 with the new request's id, or 200 with the open one about the same thing. */
export interface CreatedReview {
  id: string;
}

/** A request in the admins' queue: who it is about, and its revision (sent back when answering). */
export type QueuedReview = OwnReview & {
  subject: { userId: string } & Identity;
  resolvedBy: string | null;
  revision: string;
};

export interface ReviewQueue {
  items: QueuedReview[];
  total: number;
}

export const reviewQueueQuerySchema = z.strictObject({
  status: z.enum(["open", "resolved", "dismissed"]).default("open"),
});

/** PATCH /api/review-requests/{id} (admins): close it with an answer the person sees. */
export const closeReviewSchema = z.strictObject({
  status: z.enum(["resolved", "dismissed"]),
  resolution: z.string().trim().min(1, "Write the answer the person will see.").max(500),
  revision: z.string().min(1),
});
export type CloseReview = z.infer<typeof closeReviewSchema>;

export const REVIEW_KINDS: Record<ReviewKind, string> = {
  affiliation: "College affiliation",
  attendance: "Game attendance",
  profile: "Name",
};

export const REVIEW_STATUSES: Record<ReviewStatus, string> = { open: "Open", resolved: "Resolved", dismissed: "Dismissed" };

export const fetchOwnReviews = () => request<OwnReviewList>("GET", "/api/me/review-requests");
export const requestReview = (review: NewReview) => request<CreatedReview>("POST", "/api/me/review-requests", { body: review });
export const fetchReviewQueue = (status: ReviewStatus) => request<ReviewQueue>("GET", "/api/review-requests", { query: { status } });
export const closeReview = (requestId: string, close: CloseReview) =>
  request<void>("PATCH", url`/api/review-requests/${requestId}`, { body: close });
