import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { paths } from "@/lib/paths";
import { useSeason } from "@/context/SeasonContext";
import type { SeasonDoc } from "@/types/firestore";

export interface ChampionshipState {
  winningCollegeId: string | null;
  celebrationActive: boolean;
  /** False until the season doc has been read once. */
  loaded: boolean;
}

/** The current season's champion banner, live (seasons/{seasonId}). */
export function useChampionship(): ChampionshipState {
  const seasonId = useSeason().currentSeason?.year;
  const [state, setState] = useState<ChampionshipState>({
    winningCollegeId: null,
    celebrationActive: false,
    loaded: false,
  });

  useEffect(() => {
    if (!seasonId) return;
    const unsub = onSnapshot(doc(db, paths.season(seasonId)), (snap) => {
      const data = snap.data() as SeasonDoc | undefined;
      setState({
        winningCollegeId: data?.championCollegeId ?? null,
        celebrationActive: !!data?.celebrationActive,
        loaded: true,
      });
    });
    return () => unsub();
  }, [seasonId]);

  return state;
}
