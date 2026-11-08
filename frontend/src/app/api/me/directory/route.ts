import type { DirectoryRefresh } from "@/lib/api/me";
import { requireViewer } from "@/server/auth";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { ok, route } from "@/server/http";
import { refreshFromDirectory } from "@/server/services/accounts";

/**
 * Looks the caller's NetID up in the Yale directory again (Profile → "Check
 * Yalies again") and applies what it finds: their name and email when
 * missing, and this season's college when unassigned. 429 within the cooldown.
 */
export const POST = route(async () => {
  const viewer = await requireViewer();
  const outcome = await refreshFromDirectory(viewer.userId, viewer.netid, await getCurrentSeasonId());
  return ok({ outcome } satisfies DirectoryRefresh);
});
