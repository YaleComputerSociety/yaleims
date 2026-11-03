import { toJson } from "@/lib/api/core";
import type { SeasonList } from "@/lib/api/seasons";
import { getCurrentSeasonId, listSeasons } from "@/server/data/seasons";
import { ok, route } from "@/server/http";

/** Every season, oldest first, and which one is current (public). */
export const GET = route(async () => {
  const [seasons, currentSeasonId] = await Promise.all([listSeasons(), getCurrentSeasonId()]);
  return ok({ items: toJson(seasons), total: seasons.length, currentSeasonId } satisfies SeasonList);
});
