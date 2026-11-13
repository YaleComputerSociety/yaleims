"use client";
// The viewer's favorite sports and colleges (the games page's Favorites tab;
// G4: on the account). They come with the session, are saved whole through
// PUT /api/me/favorites and read back into the session, so every star on
// the site agrees.
import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { useSession } from "@/context/SessionContext";
import { saveFavorites } from "@/lib/api/me";
import type { Favorites } from "@/types/firestore";

export type FavoriteKind = "sport" | "college";

/** What one `in` or `array-contains-any` query takes (lib/api/matches.ts). */
const MAX_EACH = 30;
const NONE: Favorites = { sportIds: [], collegeIds: [] };
const listOf = (kind: FavoriteKind): keyof Favorites => (kind === "sport" ? "sportIds" : "collegeIds");

export function useFavorites() {
  const { viewer, refresh } = useSession();
  const [busy, setBusy] = useState(false);
  const favorites = viewer?.favorites ?? NONE;

  const has = useCallback((kind: FavoriteKind, id: string) => favorites[listOf(kind)].includes(id), [favorites]);

  const toggle = useCallback(
    async (kind: FavoriteKind, id: string) => {
      if (!viewer || busy) return;
      const list = listOf(kind);
      const current = favorites[list];
      const next = current.includes(id) ? current.filter((other) => other !== id) : [...current, id];
      if (next.length > MAX_EACH) {
        toast.error(`You can follow up to ${MAX_EACH} ${kind === "sport" ? "sports" : "colleges"}.`);
        return;
      }
      setBusy(true);
      try {
        await saveFavorites({ ...favorites, [list]: next });
        await refresh();
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [viewer, busy, favorites, refresh],
  );

  return { favorites, has, toggle, busy, signedIn: viewer !== null };
}
