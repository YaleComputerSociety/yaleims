"use client";
// The seasons, loaded once per visit: the current season with its sports and
// MVP week 1, and the ids of the seasons before it (the season pickers);
// useSeasonDetail and useSportOf read past seasons when a page shows them.
// The live parts of a season come from hooks: the champion banner from
// useChampionship, the standings from useStandings.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSeason, fetchSeasons, type SeasonDetail, type Sport } from "@/lib/api/seasons";

interface SeasonState {
  /** The current season; null while loading, or when it couldn't be loaded. */
  currentSeason: SeasonDetail | null;
  /** The seasons before the current one, oldest first. */
  pastSeasonIds: string[];
  seasonLoading: boolean;
}

const SeasonContext = createContext<SeasonState>({ currentSeason: null, pastSeasonIds: [], seasonLoading: true });

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SeasonState>({ currentSeason: null, pastSeasonIds: [], seasonLoading: true });

  useEffect(() => {
    (async () => {
      try {
        const { items, currentSeasonId } = await fetchSeasons();
        const current = items.find((season) => season.id === currentSeasonId);
        if (!current) throw new Error("No current season");
        setState({
          currentSeason: await fetchSeason(current.id),
          pastSeasonIds: items.filter((season) => season.startYear < current.startYear).map((season) => season.id),
          seasonLoading: false,
        });
      } catch (err) {
        console.error("Failed to load the seasons:", err);
        setState((prev) => ({ ...prev, seasonLoading: false }));
      }
    })();
  }, []);

  return <SeasonContext.Provider value={state}>{children}</SeasonContext.Provider>;
}

export const useSeason = () => useContext(SeasonContext);

// ── Past seasons ───────────────────────────────────────────────────────────
// Fetched once per visit each (the pickers go back and forth); a failed fetch
// is tried again next time.

const pastSeasons = new Map<string, Promise<SeasonDetail>>();

function loadPastSeason(seasonId: string): Promise<SeasonDetail> {
  if (!pastSeasons.has(seasonId)) {
    const season = fetchSeason(seasonId);
    season.catch((err) => {
      pastSeasons.delete(seasonId);
      console.error(`Failed to load season ${seasonId}:`, err);
    });
    pastSeasons.set(seasonId, season);
  }
  return pastSeasons.get(seasonId)!;
}

/** The seasons of `seasonIds` other than the current one, as they load. */
function usePastSeasons(seasonIds: (string | null)[]): Map<string, SeasonDetail> {
  const { currentSeason } = useSeason();
  const wanted = [...new Set(seasonIds)]
    .filter((id): id is string => !!id && id !== currentSeason?.id)
    .sort()
    .join(",");
  const [loaded, setLoaded] = useState<Map<string, SeasonDetail>>(new Map());

  useEffect(() => {
    if (!wanted) return;
    let live = true;
    Promise.allSettled(wanted.split(",").map(loadPastSeason)).then((results) => {
      if (!live) return;
      setLoaded(new Map(results.flatMap((r) => (r.status === "fulfilled" ? [[r.value.id, r.value] as const] : []))));
    });
    return () => {
      live = false;
    };
  }, [wanted]);

  return loaded;
}

/**
 * Any season's details (its sports, for a page showing a past season): the
 * current season from the context, another from GET /api/seasons/{id}.
 * Null while loading or if it couldn't be loaded.
 */
export function useSeasonDetail(seasonId: string | null): SeasonDetail | null {
  const { currentSeason } = useSeason();
  const past = usePastSeasons([seasonId]);
  if (!seasonId) return null;
  return seasonId === currentSeason?.id ? currentSeason : (past.get(seasonId) ?? null);
}

/** A game's sport, from the game's season (undefined while loading). */
export type SportOf = (match: { seasonId: string; sportId: string }) => Sport | undefined;

/** Looks up the sports of games from any seasons (the scores page lists several). */
export function useSportOf(matches: { seasonId: string }[]): SportOf {
  const { currentSeason } = useSeason();
  const past = usePastSeasons(matches.map((m) => m.seasonId));
  return (match) => {
    const season = match.seasonId === currentSeason?.id ? currentSeason : past.get(match.seasonId);
    return season?.sports.find((sport) => sport.id === match.sportId);
  };
}
