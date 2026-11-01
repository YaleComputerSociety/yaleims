import { toLegacySlots } from "@/lib/legacyMatch";
import { listBrackets } from "@/server/data/brackets";
import { getMatches } from "@/server/data/matches";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { listSports } from "@/server/data/sports";
import type { TournamentsResponse } from "@/types/api";

/**
 * ?year=<seasonId> (default: current season): its tournaments in the pre-v3
 * shape, newest first, times in epoch ms. A bye slot's match_id is
 * "bye-<slot>" (byes have no game; lib/legacyMatch.ts).
 */
export async function GET(req: Request) {
  try {
    const year = new URL(req.url).searchParams.get("year") || (await getCurrentSeasonId());
    if (!year) {
      return Response.json({ error: "current season doc missing" }, { status: 404 });
    }

    const [brackets, sports] = await Promise.all([listBrackets(year, "tournament"), listSports(year)]);
    const gameIds = brackets.flatMap((b) => b.slots.flatMap((s) => (s.matchId ? [s.matchId] : [])));
    const games = await getMatches(year, gameIds);
    const tournaments = brackets
      .map((t) => ({
        id: t.id,
        name: t.name,
        sport: sports.find((s) => s.id === t.sportId)?.name ?? t.sportId,
        season: year,
        createdAt: t.createdAt?.toMillis() ?? null,
        matches: toLegacySlots(t, (id) => games.get(id)?.startsAt).map((slot) => ({
          ...slot,
          timestamp: slot.timestamp?.toMillis() ?? null,
        })),
        third_place_slot: t.thirdPlaceSlot ?? undefined,
        placement_points: t.placementPoints ?? undefined,
        placements: t.placements ?? undefined,
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return Response.json({ year, tournaments } satisfies TournamentsResponse);
  } catch (err) {
    console.error("Error fetching tournaments:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
