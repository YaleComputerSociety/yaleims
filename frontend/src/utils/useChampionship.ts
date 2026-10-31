import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { legacyPaths } from "@/lib/paths";
import type { CurrentSeasonDoc } from "@src/types/legacy";

export interface ChampionshipState {
  winningCollegeId: string | null;
  celebrationActive: boolean;
}

export function useChampionship(): ChampionshipState {
  const [state, setState] = useState<ChampionshipState>({
    winningCollegeId: null,
    celebrationActive: false,
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, legacyPaths.currentSeason), (snap) => {
      const data = snap.data() as CurrentSeasonDoc | undefined;
      setState({
        winningCollegeId: data?.winningCollegeId ?? null,
        celebrationActive: !!data?.celebrationActive,
      });
    });
    return () => unsub();
  }, []);

  return state;
}
