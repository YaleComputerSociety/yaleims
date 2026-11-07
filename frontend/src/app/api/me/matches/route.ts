import { myMatchesQuerySchema, type MyMatchList } from "@/lib/api/me";
import { toMatch } from "@/lib/api/matches";
import { requireViewer } from "@/server/auth";
import { getMatches } from "@/server/data/matches";
import { listPlayerEntries } from "@/server/data/roster";
import { ok, readQuery, route } from "@/server/http";

/**
 * The games the caller is signed up for that season, by start, each with the
 * captain's call and attendance: not those a captain took them off; with
 * ?upcoming=true only those that haven't started.
 * Not a player that season: none.
 */
export const GET = route(async (req) => {
  const viewer = await requireViewer();
  const { seasonId, upcoming } = readQuery(req, myMatchesQuerySchema);
  const now = Date.now();
  const entries = (await listPlayerEntries(seasonId, viewer.userId)).filter(
    (e) => e.captainStatus !== "removed" && (!upcoming || e.startsAt.toMillis() > now)
  );
  const games = await getMatches(seasonId, entries.map((e) => e.matchId));
  const items = entries.flatMap(({ matchId, captainStatus, present }) => {
    const game = games.get(matchId);
    return game ? [{ ...toMatch({ id: matchId, ...game }), mine: { captainStatus, present } }] : [];
  });
  return ok({ items, total: items.length } satisfies MyMatchList);
});
