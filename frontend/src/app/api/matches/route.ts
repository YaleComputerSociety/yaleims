import { playedMatchesQuerySchema, toMatch, type MatchList } from "@/lib/api/matches";
import { requireViewer } from "@/server/auth";
import { listPlayedMatches } from "@/server/data/matches";
import { ok, readQuery, route } from "@/server/http";

/**
 * Played games of every season, one page (the scores page). Signed-in users
 * only, as today (D42 Q6: the pages show "Sign in" on 401).
 */
export const GET = route(async (req) => {
  await requireViewer();
  const query = readQuery(req, playedMatchesQuerySchema);
  const filter = {
    collegeId: query.collegeId,
    sportId: query.sportId,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : new Date(),
  };
  const { items, total } = await listPlayedMatches(
    filter,
    query.order,
    (query.page - 1) * query.pageSize,
    query.pageSize
  );
  return ok({ items: items.map(toMatch), total } satisfies MatchList);
});
