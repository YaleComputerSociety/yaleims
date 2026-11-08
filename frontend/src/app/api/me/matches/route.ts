import { myMatchesQuerySchema, type MyMatchList } from "@/lib/api/me";
import { toMatch } from "@/lib/api/matches";
import { assignmentsOf, disputed } from "@/lib/attendance";
import { requireViewer } from "@/server/auth";
import { getMatches } from "@/server/data/matches";
import { getPlayer } from "@/server/data/players";
import { listPlayerEntries } from "@/server/data/roster";
import { ok, readQuery, route } from "@/server/http";

/**
 * The games the caller is on that season, by start, whatever their college,
 * each with the captain's call, attendance and whether it is under review
 * (judged on all their recorded attendance that season): not those a
 * captain took them off; with ?upcoming=true only those that haven't started.
 */
export const GET = route(async (req) => {
  const viewer = await requireViewer();
  const { seasonId, upcoming } = readQuery(req, myMatchesQuerySchema);
  const [entries, player] = await Promise.all([listPlayerEntries(seasonId, viewer.userId), getPlayer(seasonId, viewer.userId)]);
  const attended = entries.filter((e) => e.present === true);
  const review = disputed(
    player ? assignmentsOf(player) : [],
    attended.map((e) => ({ collegeId: e.collegeId, startsAt: e.startsAt.toMillis(), adminConfirmed: !!e.attendanceConfirmedBy }))
  );
  const underReview = new Set(attended.filter((_, i) => review[i]).map((e) => e.matchId));

  const now = Date.now();
  const shown = entries.filter((e) => e.captainStatus !== "removed" && (!upcoming || e.startsAt.toMillis() > now));
  const games = await getMatches(seasonId, shown.map((e) => e.matchId));
  const items = shown.flatMap(({ matchId, captainStatus, present }) => {
    const game = games.get(matchId);
    const mine = { captainStatus, present, underReview: underReview.has(matchId) };
    return game ? [{ ...toMatch({ id: matchId, ...game }), mine }] : [];
  });
  return ok({ items, total: items.length } satisfies MyMatchList);
});
