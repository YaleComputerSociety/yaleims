import { ApiError } from "@/lib/api/core";
import { meChangeSchema } from "@/lib/api/me";
import { requireViewer } from "@/server/auth";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { changeUsername } from "@/server/data/users";
import { noContent, readBody, route } from "@/server/http";
import { changeName } from "@/server/services/accounts";

/**
 * Changes the caller's username (unique; the old one is freed), or their
 * name while the directory has given none (then also on this season's player doc).
 */
export const PATCH = route(async (req) => {
  const viewer = await requireViewer();
  const change = await readBody(req, meChangeSchema);
  const result = "username" in change
    ? await changeUsername(viewer.userId, change.username)
    : await changeName(viewer.userId, change.name, await getCurrentSeasonId());
  if (result === "taken") throw new ApiError("conflict", "Username is already taken");
  if (result === "locked") throw new ApiError("forbidden", "Your name comes from the Yale directory. Ask an admin to correct it.");
  if (result === "no-user") throw new ApiError("not-found", "No account for this login yet.");
  return noContent();
});
