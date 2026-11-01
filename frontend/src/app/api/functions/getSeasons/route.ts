import { getCurrentSeasonId, listSeasons } from "@/server/data/seasons";
import type { RouteBody, SeasonsResponse } from "@/types/api";

/** The current season (in the pre-v3 shape the pages read) and the past seasons' ids. */
export async function GET() {
  try {
    const [currentSeasonId, seasons] = await Promise.all([getCurrentSeasonId(), listSeasons()]);
    const current = seasons.find((s) => s.id === currentSeasonId);
    if (!current) {
      return Response.json({ error: "current season doc missing" }, { status: 404 });
    }
    return Response.json({
      current: {
        year: current.id,
        season: current.currentTerm,
        winningCollegeId: current.championCollegeId,
        celebrationActive: current.celebrationActive,
        championshipUpdatedAt: current.championshipUpdatedAt ?? undefined,
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
