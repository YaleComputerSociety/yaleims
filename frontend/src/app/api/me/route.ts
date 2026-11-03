import { ApiError } from "@/lib/api/core";
import { meChangeSchema } from "@/lib/api/me";
import { requireViewer } from "@/server/auth";
import { changeUsername } from "@/server/data/users";
import { noContent, readBody, route } from "@/server/http";

/** Changes the caller's username (unique; the old one is freed). */
export const PATCH = route(async (req) => {
  const viewer = await requireViewer();
  const { username } = await readBody(req, meChangeSchema);
  const result = await changeUsername(viewer.email, username);
  if (result === "taken") throw new ApiError("conflict", "Username is already taken");
  if (result === "no-user") throw new ApiError("not-found", "No account for this login yet.");
  return noContent();
});
