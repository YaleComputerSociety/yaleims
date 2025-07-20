"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface CurrentSeason {
  year: string; 
  season: string; 
}

interface PastSeasons {
  years: string[];
}

interface SeasonContextType {
  currentSeason: CurrentSeason | null;
  pastSeasons: PastSeasons | null;
}

const SeasonContext = createContext<SeasonContextType>({
  currentSeason: null,
  pastSeasons: null,
});

export const SeasonProvider = ({ children }: { children: ReactNode }) => {
  const [currentSeason, setCurrentSeason] = useState<CurrentSeason | null>(null);
  const [pastSeasons, setPastSeasons] = useState<PastSeasons | null>(null);

  useEffect(() => {
    const getCurrentSeason = async () => {
      try {
        const res = await fetch("/api/functions/getSeasons");  
        if (!res.ok) throw new Error("Failed to load season");
        const data = await res.json(); 
        console.log(data)
        setCurrentSeason(data.current);
        setPastSeasons(data.past);
      } catch (err) {
        console.error(err);
      }
    };
    getCurrentSeason();
  }, []);

  return (
    <SeasonContext.Provider value={{currentSeason, pastSeasons}} >
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
