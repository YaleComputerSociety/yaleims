import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  byeKey,
  firstStart,
  legacyMatchId,
  toLegacyBye,
  toLegacyMatch,
  toLegacySlots,
} from "@/lib/legacyMatch";
import { paths } from "@/lib/paths";
import type { BracketDoc, MatchDoc, SportDoc } from "@src/types/firestore";
import type { BracketEntry, MatchDoc as LegacyMatch } from "@src/types/legacy";

export interface LegacyBracket {
  /** The slots by slot number, or null while loading / when there is none. */
  slots: BracketEntry[] | null;
  /** Each slot's match by match_id (a bye as the old "Bye" match; null: its game is gone). */
  matchDetails: Record<string, LegacyMatch | null>;
  loading: boolean;
  /** "not-found", or a load failure's message. */
  error: string | null;
}

/**
 * A season's bracket (playoffs or tournament) in the pre-v3 shape the bracket
 * pages render, read once from seasons/{s}/brackets/{id} and its games
 * (lib/legacyMatch.ts). Goes away when the pages render v3 docs.
 */
export function useLegacyBracket(seasonId: string | undefined, bracketId: string | null): LegacyBracket {
  const [state, setState] = useState<LegacyBracket>({ slots: null, matchDetails: {}, loading: false, error: null });

  useEffect(() => {
    if (!seasonId || !bracketId) {
      setState({ slots: null, matchDetails: {}, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    const load = async (): Promise<LegacyBracket> => {
      const snap = await getDoc(doc(db, paths.bracket(seasonId, bracketId)));
      if (!snap.exists()) return { slots: null, matchDetails: {}, loading: false, error: "not-found" };
      const bracket = snap.data() as BracketDoc;
      const gameIds = bracket.slots.flatMap((s) => (s.matchId ? [s.matchId] : []));
      const [gameSnaps, sport] = await Promise.all([
        Promise.all(gameIds.map((id) => getDoc(doc(db, paths.match(seasonId, id))))),
        getDoc(doc(db, paths.sport(seasonId, bracket.sportId))),
      ]);
      const games = new Map(gameSnaps.filter((g) => g.exists()).map((g) => [g.id, g.data() as MatchDoc]));
      const sportName = (sport.data() as SportDoc | undefined)?.name ?? bracket.sportId;
      const tournament = bracket.kind === "tournament" ? { id: bracketId, name: bracket.name } : null;
      const startsAt = (id: string) => games.get(id)?.startsAt;

      const matchDetails: Record<string, LegacyMatch | null> = {};
      for (const slot of bracket.slots) {
        if (slot.matchId) {
          const game = games.get(slot.matchId);
          matchDetails[legacyMatchId(slot.matchId)] = game
            ? toLegacyMatch(slot.matchId, game, { sportName, tournament })
            : null;
        } else {
          matchDetails[byeKey(slot.slot)] = toLegacyBye(slot, bracket, {
            sportName,
            tournamentId: tournament?.id ?? null,
            time: firstStart(bracket, startsAt)!,
          });
        }
      }
      return { slots: toLegacySlots(bracket, startsAt), matchDetails, loading: false, error: null };
    };

    load()
      .then((result) => !cancelled && setState(result))
      .catch((err) => {
        console.error(`Error loading bracket ${bracketId} (${seasonId}):`, err);
        if (!cancelled) setState({ slots: null, matchDetails: {}, loading: false, error: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [seasonId, bracketId]);

  return state;
}
