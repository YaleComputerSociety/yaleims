"use client";
// A whole season's games, read once per visit per season, for the Day view:
// its date strip marks the days that have games, which no small query
// answers. The List view pages through the API instead and never reads a
// season whole (R09).
import { useEffect, useState } from "react";
import { fetchSeasonMatches, type Match } from "@/lib/api/matches";

const loaded = new Map<string, Promise<Match[]>>();

function gamesOf(seasonId: string): Promise<Match[]> {
  let games = loaded.get(seasonId);
  if (!games) {
    games = fetchSeasonMatches(seasonId).then(
      ({ items }) => items,
      (err) => {
        loaded.delete(seasonId);
        console.error(`Failed to load the games of ${seasonId}:`, err);
        return [];
      },
    );
    loaded.set(seasonId, games);
  }
  return games;
}

/** The season's games by start; null while they load (or without a season). */
export function useSeasonGames(seasonId: string | null): Match[] | null {
  const [games, setGames] = useState<{ seasonId: string; items: Match[] } | null>(null);
  useEffect(() => {
    if (!seasonId) return;
    let live = true;
    gamesOf(seasonId).then((items) => live && setGames({ seasonId, items }));
    return () => {
      live = false;
    };
  }, [seasonId]);
  return games?.seasonId === seasonId ? games.items : null;
}
