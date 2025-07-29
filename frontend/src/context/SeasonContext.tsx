"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { CurrentSeason, PastSeasons } from "@src/types/components";

interface SeasonContextType {
  currentSeason: CurrentSeason | null;
  pastSeasons: PastSeasons | null;
  seasonLoading: boolean;
}

const SeasonContext = createContext<SeasonContextType>({
  currentSeason: null,
  pastSeasons: null,
  seasonLoading: true,
});

export const SeasonProvider = ({ children }: { children: ReactNode }) => {
  const [currentSeason, setCurrentSeason] = useState<CurrentSeason | null>(
    null
  );
  const [pastSeasons, setPastSeasons] = useState<PastSeasons | null>(null);
  const [seasonLoading, setSeasonLoading] = useState<boolean>(true);

  useEffect(() => {
    const getCurrentSeason = async () => {
      setSeasonLoading(true);
      try {
        const res = await fetch("/api/functions/getSeasons");
        if (!res.ok) throw new Error("Failed to load season");
        const data = await res.json();
        setCurrentSeason(data.current);
        setPastSeasons(data.past);
      } catch (err) {
        console.error(err);
      } finally {
        setSeasonLoading(false);
      }
    };
    getCurrentSeason();
  }, []);

  return (
    <SeasonContext.Provider
      value={{ currentSeason, pastSeasons, seasonLoading }}
    >
      {children}
    </SeasonContext.Provider>
  );
};

export const useSeason = () => {
  const season = useContext(SeasonContext);
  if (season === null)
    throw new Error("useSeason must be used inside <SeasonProvider>");
  return season;
};
