import { listStandings } from "@/server/data/colleges";
import type { LeaderboardEntry, RouteBody } from "@/types/api";

/** "yyyy-mm-dd" → the pre-v3 rank day "d-m-yyyy". */
const legacyRankDay = (date: string) => {
  const [y, m, d] = date.split("-");
  return y && m && d ? `${Number(d)}-${Number(m)}-${y}` : date;
};

/** A season's college standings, best first, in the pre-v3 shape. */
export async function GET(req: Request) {
  try {
    const seasonId = new URL(req.url).searchParams.get("seasonId");
    if (!seasonId) {
      return Response.json({ error: "seasonId is required" }, { status: 400 });
    }
    const standings = await listStandings(seasonId);
    if (standings.length === 0) {
      return new Response("No colleges found.", { status: 404 });
    }
    const entries = standings.map(({ rankDate, ...college }) => ({
      ...college,
      season: seasonId,
      today: legacyRankDay(rankDate),
    }));
    return Response.json(entries satisfies RouteBody<LeaderboardEntry[]>);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
