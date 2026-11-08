import { reviewQueueQuerySchema, toOwnReview, type ReviewQueue } from "@/lib/api/reviews";
import { authorize, can } from "@/server/auth";
import { listRequests } from "@/server/data/reviewRequests";
import { getUsers, identityOf } from "@/server/data/users";
import { ok, readQuery, route } from "@/server/http";

/** The admins' queue: requests with a status (open by default), newest first, the latest 200, with who each is about. */
export const GET = route(async (req) => {
  await authorize(can.managePeople);
  const { status } = readQuery(req, reviewQueueQuerySchema);
  const requests = await listRequests(status, 200);
  const users = await getUsers(requests.map((r) => r.subjectUserId));
  const items = requests.map((r) => {
    return {
      ...toOwnReview(r),
      subject: { userId: r.subjectUserId, ...identityOf(users.get(r.subjectUserId), r.subjectUserId, true) },
      resolvedBy: r.resolvedBy,
      revision: r.revision,
    };
  });
  return ok({ items, total: items.length } satisfies ReviewQueue);
});
