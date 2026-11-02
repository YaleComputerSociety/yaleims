"use client";
// Which games belong to a tournament, by name: the match lists badge them
// (tournament games also earn placement points). A game only knows its
// bracket's id, so this reads the tournaments of each season the games come
// from, once per visit per season.
import { useEffect, useState } from "react";
import { fetchBrackets } from "@/lib/api/brackets";
import type { Match } from "@/lib/api/matches";

/** seasonId → (bracketId → tournament name). */
const loaded = new Map<string, Promise<Map<string, string>>>();

function tournamentsOf(seasonId: string): Promise<Map<string, string>> {
  if (!loaded.has(seasonId)) {
    const names = fetchBrackets(seasonId, { kind: "tournament" }).then(
      ({ items }) => new Map(items.map((bracket) => [bracket.id, bracket.name])),
      (err) => {
        loaded.delete(seasonId);
        console.error(`Failed to load the tournaments of ${seasonId}:`, err);
        return new Map<string, string>();
      }
    );
    loaded.set(seasonId, names);
  }
  return loaded.get(seasonId)!;
}

/** The tournament a game belongs to (undefined: none, or not loaded yet). */
export type TournamentOf = (match: Pick<Match, "seasonId" | "bracketId">) => string | undefined;

/** Looks up the tournament of any of `matches`. */
export function useTournamentNames(matches: Pick<Match, "seasonId" | "bracketId">[]): TournamentOf {
  const seasons = [...new Set(matches.filter((m) => m.bracketId).map((m) => m.seasonId))].sort().join(",");
  const [names, setNames] = useState<Map<string, Map<string, string>>>(new Map());

  useEffect(() => {
    if (!seasons) return;
    let live = true;
    const ids = seasons.split(",");
    Promise.all(ids.map(tournamentsOf)).then((maps) => {
      if (live) setNames(new Map(ids.map((id, i) => [id, maps[i]])));
    });
    return () => {
      live = false;
    };
  }, [seasons]);

  return (match) => (match.bracketId ? names.get(match.seasonId)?.get(match.bracketId) : undefined);
}
