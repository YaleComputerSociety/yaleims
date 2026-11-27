import { ApiError } from "@/lib/api/core";
import type { MyYalemoji } from "@/lib/api/me";
import { requireViewer } from "@/server/auth";
import { ok, route } from "@/server/http";
import { getYalemojiAvatar } from "@/server/yalemoji";

/**
 * The caller's Yalemoji avatar (the account button). The NetID is the
 * session's, never a parameter: no one can look up someone else's. 503 when
 * Yalemoji can't be reached, so the page keeps the avatar it last showed.
 */
export const GET = route(async () => {
  const viewer = await requireViewer();
  const yalemoji = await getYalemojiAvatar(viewer.netid);
  if (yalemoji === undefined) throw new ApiError("unavailable", "Yalemoji can't be reached right now.");
  return ok({ netid: viewer.netid, yalemoji } satisfies MyYalemoji);
});
