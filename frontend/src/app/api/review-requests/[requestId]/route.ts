import { ApiError } from "@/lib/api/core";
import { closeReviewSchema } from "@/lib/api/reviews";
import { authorize, can } from "@/server/auth";
import { noContent, readBody, route } from "@/server/http";
import { closeRequest } from "@/server/services/reviews";

type Params = { requestId: string };

/** Closes an open request (resolved or dismissed) with the answer the person sees; a stale revision gets 409 (admins). */
export const PATCH = route<Params>(async (req, { params }) => {
  const { requestId } = await params;
  const viewer = await authorize(can.managePeople);
  const close = await readBody(req, closeReviewSchema);
  if ((await closeRequest(requestId, close, await viewer.actor())) === "not-found") throw new ApiError("not-found", "No such request.");
  return noContent();
});
