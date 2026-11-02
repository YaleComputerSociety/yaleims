"use client";
// A season's standings, live: the browser listens to seasons/{s}/colleges
// (public), so a scored game moves the table on every open page.
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { paths } from "@/lib/paths";
import type { CollegeDoc, WithId } from "@/types/firestore";

export interface Standings {
  /** Best first (by rank). */
  colleges: WithId<CollegeDoc>[];
  /** True until the first snapshot (or error) after the season changes. */
  loading: boolean;
}

/** The standings of `seasonId`; none while it is null. */
export function useStandings(seasonId: string | null): Standings {
  const [state, setState] = useState<Standings & { seasonId: string | null }>({ seasonId: null, colleges: [], loading: true });

  useEffect(() => {
    if (!seasonId) return;
    return onSnapshot(
      query(collection(db, paths.colleges(seasonId)), orderBy("rank", "asc")),
      (snap) => {
        const colleges = snap.docs.map((d) => ({ id: d.id, ...(d.data() as CollegeDoc) }));
        setState({ seasonId, colleges, loading: false });
      },
      (err) => {
        console.error("Standings listener error:", err);
        setState({ seasonId, colleges: [], loading: false });
      }
    );
  }, [seasonId]);

  // Until the new season's first snapshot, show it as loading, not the old season's table.
  if (!seasonId) return { colleges: [], loading: false };
  return state.seasonId === seasonId ? state : { colleges: [], loading: true };
}
