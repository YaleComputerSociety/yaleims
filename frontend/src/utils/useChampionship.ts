import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

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
    const unsub = onSnapshot(doc(db, "seasons", "current"), (snap) => {
      const data = snap.data() as
        | { winningCollegeId?: string | null; celebrationActive?: boolean }
        | undefined;
      setState({
        winningCollegeId: data?.winningCollegeId ?? null,
        celebrationActive: !!data?.celebrationActive,
      });
    });
    return () => unsub();
  }, []);

  return state;
}
