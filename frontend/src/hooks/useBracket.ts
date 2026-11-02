"use client";
// One bracket (playoffs or tournament) as the bracket pages draw it: its
// cells by slot, read once from GET /api/seasons/{s}/brackets/{id}.
import { useEffect, useState } from "react";
import { bracketCells, type BracketCellData } from "@/components/brackets/BracketCell";
import { fetchBracket, type BracketDetail } from "@/lib/api/brackets";
import { ApiError } from "@/lib/api/core";

export interface BracketState {
  bracket: BracketDetail | null;
  /** By slot; null while loading or when there is none. */
  cells: BracketCellData[] | null;
  loading: boolean;
  /** "not-found", or a load failure's message. */
  error: string | null;
}

const NONE: BracketState = { bracket: null, cells: null, loading: false, error: null };

/** The bracket `bracketId` of `seasonId`; none while either is missing. */
export function useBracket(seasonId: string | undefined, bracketId: string | null): BracketState {
  const [state, setState] = useState<BracketState>(NONE);

  useEffect(() => {
    if (!seasonId || !bracketId) {
      setState(NONE);
      return;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchBracket(seasonId, bracketId).then(
      (bracket) => live && setState({ bracket, cells: bracketCells(bracket), loading: false, error: null }),
      (err) => {
        if (!live) return;
        const notFound = err instanceof ApiError && err.code === "not-found";
        if (!notFound) console.error(`Error loading bracket ${bracketId} (${seasonId}):`, err);
        setState({ ...NONE, error: notFound ? "not-found" : String(err) });
      }
    );
    return () => {
      live = false;
    };
  }, [seasonId, bracketId]);

  return state;
}
