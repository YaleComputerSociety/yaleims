import { getCurrentSeason } from "@/server/data/seasons";
import { listTournaments } from "@/server/data/tournaments";

/** ?year=<seasonId> (default: current season): its tournaments, newest first, timestamps in ms. */
export async function GET(req: Request) {
  try {
    let year = new URL(req.url).searchParams.get("year") ?? "";
    if (!year) {
      const current = await getCurrentSeason();
      if (!current) {
        return Response.json({ error: "current season doc missing" }, { status: 404 });
      }
      year = current.year;
    }

    const tournaments = (await listTournaments(year))
      .map((t) => ({
        ...t,
        createdAt: t.createdAt?.toMillis?.() ?? null,
        matches: (t.matches || []).map((match) => ({
          ...match,
          timestamp: match.timestamp?.toMillis?.() ?? null,
        })),
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return Response.json({ year, tournaments });
  } catch (err) {
    console.error("Error fetching tournaments:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
