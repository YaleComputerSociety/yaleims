"use client";
// The seasons, loaded once per visit: the current season with its sports and
// MVP week 1, and the ids of the seasons before it (the season pickers);
// useSeasonDetail reads a past season's details when a page shows one.
// The live parts of a season come from hooks: the champion banner from
// useChampionship, the standings from useStandings.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSeason, fetchSeasons, type SeasonDetail } from "@/lib/api/seasons";

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

// Past seasons' details, fetched once per visit each (the pickers go back and forth).
const pastSeasons = new Map<string, Promise<SeasonDetail>>();

/**
 * Any season's details (its sports, for a page showing a past season): the
 * current season from the context, another from GET /api/seasons/{id}.
 * Null while loading or if it couldn't be loaded.
 */
export function useSeasonDetail(seasonId: string | null): SeasonDetail | null {
  const { currentSeason } = useSeason();
  const isCurrent = !!seasonId && seasonId === currentSeason?.id;
  const [past, setPast] = useState<SeasonDetail | null>(null);

  useEffect(() => {
    if (!seasonId || isCurrent) return;
    let live = true;
    if (!pastSeasons.has(seasonId)) pastSeasons.set(seasonId, fetchSeason(seasonId));
    pastSeasons.get(seasonId)!.then(
      (season) => live && setPast(season),
      (err) => {
        pastSeasons.delete(seasonId);
        console.error(`Failed to load season ${seasonId}:`, err);
      }
    );
    return () => {
      live = false;
    };
  }, [seasonId, isCurrent]);

  if (isCurrent) return currentSeason;
  return past?.id === seasonId ? past : null;
}
