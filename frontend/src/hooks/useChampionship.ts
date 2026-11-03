"use client";
// The current season's champion banner, live: the browser listens to the
// season doc (public, like the standings), so the confetti starts on every
// open page the moment an admin turns it on.
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useSeason } from "@/context/SeasonContext";
import { db } from "@/lib/firebase";
import { paths } from "@/lib/paths";
import type { SeasonDoc } from "@/types/firestore";

export interface Championship {
  championCollegeId: string | null;
  celebrationActive: boolean;
  /** False until the season doc has been read once. */
  loaded: boolean;
}

export function useChampionship(): Championship {
  const seasonId = useSeason().currentSeason?.id;
  const [state, setState] = useState<Championship>({ championCollegeId: null, celebrationActive: false, loaded: false });

  useEffect(() => {
    if (!seasonId) return;
    return onSnapshot(doc(db, paths.season(seasonId)), (snap) => {
      const season = snap.data() as SeasonDoc | undefined;
      setState({
        championCollegeId: season?.championCollegeId ?? null,
        celebrationActive: !!season?.celebrationActive,
        loaded: true,
      });
    });
  }, [seasonId]);

  return state;
}
