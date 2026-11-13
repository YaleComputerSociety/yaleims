"use client";
// The games page's list: a season's games in pages from the matches API's
// cursor mode (lib/api/matches.ts), merged by id and shown by day and
// competition (GamesByDay). From the anchor day on, oldest first, the list
// grows downwards as the viewer nears the bottom and upwards one page per
// press of "Earlier games"; a list of finished games runs newest first
// (lib/games.ts listBounds). The competition-kind filter has no API
// counterpart: it hides loaded games and loads on until a screen is full.
// While the tab is visible, the first page is read again every minute so new
// scores show without a reload (G8).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchMatchPage, type Match } from "@/lib/api/matches";
import type { MyMatch } from "@/lib/api/me";
import { easternDate } from "@/lib/dates";
import { groupGames, listBounds, matchesFilter, mergeGames, type Competition, type ListFilter } from "@/lib/games";
import type { EasternDate } from "@/types/firestore";
import GamesByDay from "./GamesByDay";

const PAGE_SIZE = 40;
/** How many pages the kind filter may load on its own to fill a screen. */
const MAX_FILL_PAGES = 5;
const REFRESH_MS = 60_000;

interface GamesListProps {
  seasonId: string;
  filter: ListFilter;
  /** The Eastern day the list starts on. */
  anchor: EasternDate;
  competitionOf: (game: Match) => Competition;
  myEntries: Map<string, MyMatch["mine"]>;
  now: Date;
  /** Read the first page again every minute (today's list). */
  refresh: boolean;
  /** What to say when nothing passes the filter. */
  emptyMessage: string;
}

interface Loaded {
  /** Which query these games answer; another query starts over. */
  key: string;
  games: Match[];
  /** The cursor of the page after the last one; null: the end. */
  next: string | null;
  /** The cursor of the page before the first one; undefined: not asked yet; null: the season's start. */
  earlier: string | null | undefined;
  /** Pages the kind filter loaded on its own. */
  fills: number;
}

type Busy = "first" | "down" | "up" | null;

export default function GamesList({ seasonId, filter, anchor, competitionOf, myEntries, now, refresh, emptyMessage }: GamesListProps) {
  const key = JSON.stringify([seasonId, filter, anchor]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const current = loaded?.key === key ? loaded : null;
  // Answers to a query the viewer has moved away from are dropped.
  const latest = useRef(key);
  latest.current = key;

  // One page: downwards from `after` in the list's order, or upwards (the games before the list's start, newest first).
  const readPage = useCallback(
    (direction: "down" | "up", after: string | null) => {
      const { order, from, to, status } = listBounds(filter, anchor, new Date());
      const base = { sportId: filter.sportId, collegeId: filter.collegeId, collegeIds: filter.collegeIds, sportIds: filter.sportIds, status, limit: PAGE_SIZE, after: after ?? undefined };
      if (direction === "down") return fetchMatchPage(seasonId, { ...base, order, from: from?.toISOString(), to: to?.toISOString() });
      return fetchMatchPage(seasonId, { ...base, order: "desc", to: new Date((from ?? new Date()).getTime() - 1).toISOString() });
    },
    [seasonId, filter, anchor],
  );

  const run = useCallback(
    async (what: Exclude<Busy, null>, after: string | null, apply: (previous: Loaded | null, items: Match[], next: string | null) => Loaded) => {
      setBusy(what);
      setError(null);
      try {
        const page = await readPage(what === "up" ? "up" : "down", after);
        if (latest.current !== key) return;
        setLoaded((previous) => apply(previous?.key === key ? previous : null, page.items, page.next));
      } catch (err) {
        if (latest.current === key) setError((err as Error).message);
      } finally {
        if (latest.current === key) setBusy(null);
      }
    },
    [key, readPage],
  );

  const order = listBounds(filter, anchor, now).order;

  // The first page of a query.
  useEffect(() => {
    run("first", null, (_, items, next) => ({ key, games: items, next, earlier: undefined, fills: 0 }));
  }, [key, run]);

  const loadDown = useCallback(
    (fill = false) => {
      if (!current?.next || busy) return;
      run("down", current.next, (previous, items, next) => ({
        key,
        games: mergeGames(previous?.games ?? [], items, order),
        next,
        earlier: previous?.earlier,
        fills: (previous?.fills ?? 0) + (fill ? 1 : 0),
      }));
    },
    [current, busy, run, key, order],
  );

  // "Earlier games": keep what the viewer is looking at where it is.
  const scrollFix = useRef<{ height: number; y: number } | null>(null);
  const loadUp = () => {
    if (!current || current.earlier === null || busy) return;
    scrollFix.current = { height: document.documentElement.scrollHeight, y: window.scrollY };
    run("up", current.earlier ?? null, (previous, items, next) => ({
      key,
      games: mergeGames(previous?.games ?? [], items, order),
      next: previous?.next ?? null,
      earlier: next,
      fills: previous?.fills ?? 0,
    }));
  };
  useLayoutEffect(() => {
    if (!scrollFix.current || busy) return;
    const { height, y } = scrollFix.current;
    scrollFix.current = null;
    window.scrollTo(0, y + (document.documentElement.scrollHeight - height));
  }, [busy]);

  // Downwards as the viewer nears the bottom.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadDown(), { rootMargin: "600px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadDown]);

  // Today's page again every minute while the tab is visible.
  useEffect(() => {
    if (!refresh) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible" || busy) return;
      readPage("down", null).then(
        (page) => latest.current === key && setLoaded((previous) => (previous?.key === key ? { ...previous, games: mergeGames(previous.games, page.items, order) } : previous)),
        () => undefined, // a missed refresh isn't worth a message; the next one may work
      );
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh, busy, readPage, key, order]);

  const games = current?.games ?? [];
  const visible = filter.kind ? games.filter((game) => matchesFilter(game, { kind: filter.kind }, competitionOf(game), now)) : games;

  // The kind filter may leave a page nearly empty: load on, a few pages at most.
  useEffect(() => {
    if (filter.kind && current && current.next && current.fills < MAX_FILL_PAGES && !busy && visible.length < PAGE_SIZE / 2) loadDown(true);
  }, [filter.kind, current, busy, visible.length, loadDown]);

  const days = groupGames(visible, competitionOf);
  const canLoadEarlier = order === "asc" && current !== null && current.earlier !== null;

  return (
    <div className="space-y-3">
      {canLoadEarlier && (
        <button
          type="button"
          onClick={loadUp}
          disabled={busy !== null}
          className="w-full py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60"
        >
          {busy === "up" ? "Loading…" : "Earlier games"}
        </button>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}{" "}
          <button type="button" className="underline font-semibold" onClick={() => run("first", null, (_, items, next) => ({ key, games: items, next, earlier: undefined, fills: 0 }))}>
            Try again
          </button>
        </p>
      )}
      {!current ? (
        busy === "first" && <Skeleton />
      ) : days.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      ) : (
        <GamesByDay days={days} today={easternDate(now)} now={now} myEntries={myEntries} />
      )}
      <div ref={sentinel} aria-hidden className="h-px" />
      {busy === "down" && <p className="text-center text-xs text-gray-400 dark:text-gray-500">Loading…</p>}
      {current?.next === null && visible.length > 0 && <p className="text-center text-xs text-gray-400 dark:text-gray-500">No more games this season</p>}
    </div>
  );
}

const Skeleton = () => (
  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-pulse" aria-busy>
    <div className="h-8 bg-gray-100 dark:bg-gray-900" />
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="h-14 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950" />
    ))}
  </div>
);
