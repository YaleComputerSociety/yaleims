import { easternDate, mondayOf } from "@/lib/dates";
import { firstMatchStart } from "@/server/data/matches";
import { getCurrentSeasonId, listSeasons } from "@/server/data/seasons";
import type { RouteBody, SeasonsResponse } from "@/types/api";

/**
 * The current season (in the pre-v3 shape the pages read, plus its MVP week
 * 1, D42) and the past seasons' ids.
 */
export async function GET() {
  try {
    const [currentSeasonId, seasons] = await Promise.all([getCurrentSeasonId(), listSeasons()]);
    const current = seasons.find((s) => s.id === currentSeasonId);
    if (!current) {
      return Response.json({ error: "current season doc missing" }, { status: 404 });
    }
    const firstGame = await firstMatchStart(current.id);
    return Response.json({
      current: {
        year: current.id,
        season: current.currentTerm,
        winningCollegeId: current.championCollegeId,
        celebrationActive: current.celebrationActive,
        championshipUpdatedAt: current.championshipUpdatedAt ?? undefined,
        mvpWeekOne: firstGame && mondayOf(easternDate(firstGame)),
      },
      past: {
        years: seasons.filter((s) => s.startYear < current.startYear).map((s) => s.id),
      },
    } satisfies RouteBody<SeasonsResponse>);
  } catch (err) {
    console.error("Error fetching seasons:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
