import { ApiError } from "@/lib/api/core";
import { newReviewSchema, toOwnReview, type CreatedReview, type OwnReviewList } from "@/lib/api/reviews";
import { requireViewer } from "@/server/auth";
import { listOwnRequests } from "@/server/data/reviewRequests";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { created, ok, readBody, route } from "@/server/http";
import { createRequest } from "@/server/services/reviews";

/** The caller's review requests, newest first, with the admins' answers. */
export const GET = route(async () => {
  const viewer = await requireViewer();
  const items = (await listOwnRequests(viewer.userId)).map(toOwnReview);
  return ok({ items, total: items.length } satisfies OwnReviewList);
});

/** Asks an admin to review the caller's college, a game's attendance or their name, this season; an open request about the same thing is returned (200). */
export const POST = route(async (req) => {
  const viewer = await requireViewer();
  const review = await readBody(req, newReviewSchema);
  const seasonId = await getCurrentSeasonId();
  if (!seasonId) throw new ApiError("conflict", "There's no active season to review.");
  const { id, created: isNew } = await createRequest(viewer.userId, seasonId, review);
  return isNew ? created({ id } satisfies CreatedReview) : ok({ id } satisfies CreatedReview);
});
