import { getCurrentSeason, getPastSeasonIds } from "@/server/data/seasons";
import type { RouteBody, SeasonsResponse } from "@/types/api";

export async function GET() {
  try {
    const [current, pastYears] = await Promise.all([
      getCurrentSeason(),
      getPastSeasonIds(),
    ]);
    if (!current) {
      return Response.json({ error: "current season doc missing" }, { status: 404 });
    }
    if (!pastYears) {
      return Response.json({ error: "past season doc missing" }, { status: 404 });
    }
    return Response.json({
      current,
      past: { years: pastYears },
    } satisfies RouteBody<SeasonsResponse>);
  } catch (err) {
    console.error("Error fetching seasons:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
