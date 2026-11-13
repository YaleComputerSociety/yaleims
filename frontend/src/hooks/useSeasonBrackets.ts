"use client";
// A season's brackets (playoffs and tournaments) by id, read once per visit
// per season: the games list names the competition of a bracket game and
// links to its page (lib/games.ts competitionOf). Successor of
// useTournamentNames, which knew tournaments only.
import { useEffect, useState } from "react";
import { fetchBrackets, type Bracket } from "@/lib/api/brackets";

const loaded = new Map<string, Promise<Map<string, Bracket>>>();

function bracketsOf(seasonId: string): Promise<Map<string, Bracket>> {
  let brackets = loaded.get(seasonId);
  if (!brackets) {
    brackets = fetchBrackets(seasonId).then(
      ({ items }) => new Map(items.map((bracket) => [bracket.id, bracket])),
      (err) => {
        loaded.delete(seasonId); // so the next visit tries again
        console.error(`Failed to load the brackets of ${seasonId}:`, err);
        return new Map<string, Bracket>();
      },
    );
    loaded.set(seasonId, brackets);
  }
  return brackets;
}

/** The season's brackets by id; null while they load (or without a season). */
export function useSeasonBrackets(seasonId: string | null): Map<string, Bracket> | null {
  const [brackets, setBrackets] = useState<{ seasonId: string; byId: Map<string, Bracket> } | null>(null);
  useEffect(() => {
    if (!seasonId) return;
    let live = true;
    bracketsOf(seasonId).then((byId) => live && setBrackets({ seasonId, byId }));
    return () => {
      live = false;
    };
  }, [seasonId]);
  return brackets?.seasonId === seasonId ? brackets.byId : null;
}
