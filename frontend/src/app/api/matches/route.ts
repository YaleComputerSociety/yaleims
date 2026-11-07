import { playedMatchesQuerySchema, toMatch, type MatchList } from "@/lib/api/matches";
import { requireViewer } from "@/server/auth";
import { listSeasonMatchPage } from "@/server/data/matches";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { ok, readQuery, route } from "@/server/http";

/** One season's played games, paged, for signed-in users. */
export const GET = route(async (req) => {
  await requireViewer();
  const query = readQuery(req, playedMatchesQuerySchema);
  const seasonId = query.seasonId ?? await getCurrentSeasonId();
  if (!seasonId) return ok({ items: [], total: 0 } satisfies MatchList);
  const { items, total } = await listSeasonMatchPage(seasonId, {
    collegeId: query.collegeId,
    sportId: query.sportId,
    status: "final",
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : new Date(),
  }, query.order, { page: query.page, pageSize: query.pageSize });
  return ok({ items: items.map(toMatch), total } satisfies MatchList);
});
