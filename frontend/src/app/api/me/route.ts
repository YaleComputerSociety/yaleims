import { ApiError } from "@/lib/api/core";
import { meChangeSchema } from "@/lib/api/me";
import { requireViewer } from "@/server/auth";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { noContent, readBody, route } from "@/server/http";
import { changeName } from "@/server/services/accounts";

/** Changes the caller's name while it's theirs to set (then also on this season's player doc). */
export const PATCH = route(async (req) => {
  const viewer = await requireViewer();
  const { name } = await readBody(req, meChangeSchema);
  const result = await changeName(viewer.userId, name, await getCurrentSeasonId());
  if (result === "locked") throw new ApiError("forbidden", "Your name comes from the Yale directory or an admin. Ask an admin to correct it.");
  if (result === "no-user") throw new ApiError("not-found", "No account for this login yet.");
  return noContent();
});
