import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { paths } from "@/lib/paths";
import type { CurrentSeasonDoc } from "@src/types/firestore";

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
    const unsub = onSnapshot(doc(db, paths.currentSeason), (snap) => {
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
