import { ApiError } from "@/lib/api/core";
import { favoritesSchema } from "@/lib/api/me";
import { requireViewer } from "@/server/auth";
import { setFavorites } from "@/server/data/users";
import { noContent, readBody, route } from "@/server/http";

/** Replaces the caller's favorite sports and colleges (the games list's Favorites tab). */
export const PUT = route(async (req) => {
  const viewer = await requireViewer();
  const favorites = await readBody(req, favoritesSchema);
  if (!(await setFavorites(viewer.userId, favorites))) throw new ApiError("not-found", "No account for this login yet.");
  return noContent();
});
