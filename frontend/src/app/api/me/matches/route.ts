import { myMatchesQuerySchema } from "@/lib/api/me";
import { toMatch, type MatchList } from "@/lib/api/matches";
import { requireViewer } from "@/server/auth";
import { getMatches } from "@/server/data/matches";
import { listPlayerEntries } from "@/server/data/roster";
import { ok, readQuery, route } from "@/server/http";

/**
 * The games the caller is signed up for that season, by start: not those a
 * captain took them off; with ?upcoming=true only those that haven't started.
 * Not a player that season: none.
 */
export const GET = route(async (req) => {
  const viewer = await requireViewer();
  const { seasonId, upcoming } = readQuery(req, myMatchesQuerySchema);
  const now = Date.now();
  const ids = (await listPlayerEntries(seasonId, viewer.email))
    .filter((e) => e.captainStatus !== "removed" && (!upcoming || e.startsAt.toMillis() > now))
    .map((e) => e.matchId);
  const games = await getMatches(seasonId, ids);
  const items = ids.flatMap((id) => {
    const game = games.get(id);
    return game ? [toMatch({ id, ...game })] : [];
  });
  return ok({ items, total: items.length } satisfies MatchList);
});
