import { listCollegeStandings } from "@/server/data/colleges";

/** A season's college standings, best first. */
export async function GET(req: Request) {
  try {
    const seasonId = new URL(req.url).searchParams.get("seasonId");
    if (!seasonId) {
      return Response.json({ error: "seasonId is required" }, { status: 400 });
    }
    const standings = await listCollegeStandings(seasonId);
    if (standings.length === 0) {
      return new Response("No colleges found.", { status: 404 });
    }
    return Response.json(standings);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
