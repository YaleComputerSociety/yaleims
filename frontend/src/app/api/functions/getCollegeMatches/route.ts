import { getCurrentSeason } from "@/server/data/seasons";
import { listUpcomingCollegeMatches } from "@/server/data/matches";

/** ?college=<abbr>&limit=<n>: the college's next matches this season, up to n home + n away. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const college = searchParams.get("college");
    const limit = Number(searchParams.get("limit") ?? 3);
    if (!college) {
      return Response.json({ error: "college is required" }, { status: 400 });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return Response.json({ error: "limit must be 1-50" }, { status: 400 });
    }
    const current = await getCurrentSeason();
    if (!current) {
      return Response.json({ error: "current season doc missing" }, { status: 404 });
    }

    const matches = await listUpcomingCollegeMatches(current.year, college, new Date(), limit);
    return Response.json(
      matches.map((m) => ({
        id: m.id,
        home_college: m.home_college,
        away_college: m.away_college,
        sport: m.sport,
        home_college_score: m.home_college_score,
        away_college_score: m.away_college_score,
        home_college_participants: m.home_college_participants,
        away_college_participants: m.away_college_participants,
        location: m.location,
        location_extra: m.location_extra,
        winner: m.winner,
        type: m.type,
        timestamp: m.timestamp.toDate().toISOString(),
      }))
    );
  } catch (err) {
    console.error("Error fetching college matches:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
