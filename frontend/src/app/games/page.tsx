"use client";
// The games page (GAMES-REDESIGN-PLAN §2.1): a season's games in one list by
// day and competition, from today on, earlier games on request (the List
// view), or one day at a time on a date strip (the Day view, the older layout
// kept as a choice, G15). Tabs: All, Favorites (the viewer's starred sports
// and colleges), My college. Sport chips and a Filters panel narrow the list.
// Everything the viewer chose lives in the URL (?tab=&sport=&college=&kind=
// &status=&date=&season=&view=), so a view can be shared and the back button
// works. Signed in only (D45).
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import DayView from "@/components/games/DayView";
import FiltersSheet, { KINDS, NO_FILTERS, STATUSES, type SheetFilters } from "@/components/games/FiltersSheet";
import GamesList from "@/components/games/GamesList";
import SportChips, { chipClass } from "@/components/games/SportChips";
import LoadingScreen from "@/components/layout/LoadingScreen";
import PageHeading from "@/components/layout/PageHeading";
import SignInRequired from "@/components/layout/SignInRequired";
import GlassDropdown from "@/components/ui/GlassDropdown";
import { useSeason, useSeasonDetail } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import { useSeasonBrackets } from "@/hooks/useSeasonBrackets";
import type { Match } from "@/lib/api/matches";
import { fetchMyMatches, type MyMatch } from "@/lib/api/me";
import { COLLEGES, collegeIdOfName, collegeName } from "@/lib/colleges";
import { easternDate } from "@/lib/dates";
import { competitionOf, type ListFilter } from "@/lib/games";
import { useNow } from "@/lib/useNow";
import type { EasternDate } from "@/types/firestore";

// ── URL state ───────────────────────────────────────────────────────────────

const TABS = ["all", "favorites", "college"] as const;
type Tab = (typeof TABS)[number];
const VIEWS = ["list", "day"] as const;
type View = (typeof VIEWS)[number];

/** Everything the viewer chose, as the URL carries it; defaults stay out of the URL. */
interface PageState extends SheetFilters {
  tab: Tab;
  view: View;
  /** null: the current season. */
  season: string | null;
  sport: string;
  /** null: today, or a past season's first week. */
  date: EasternDate | null;
}

const DEFAULTS: PageState = { tab: "all", view: "list", season: null, sport: "", date: null, ...NO_FILTERS };

const oneOf = <T extends string>(values: readonly T[], value: string | null) => values.find((v) => v === value);

/** The URL's choices; unknown values fall back to the defaults. `college` may be a name (the leaderboard's older links). */
function readState(params: URLSearchParams): PageState {
  const date = params.get("date");
  return {
    tab: oneOf(TABS, params.get("tab")) ?? "all",
    view: oneOf(VIEWS, params.get("view")) ?? "list",
    season: params.get("season"),
    sport: params.get("sport") ?? "",
    collegeId: collegeIdOfName(COLLEGES, params.get("college")) ?? "",
    kind: oneOf(KINDS.map((k) => k.value), params.get("kind")) ?? "",
    status: oneOf(STATUSES.map((s) => s.value), params.get("status")) ?? "",
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
  };
}

function writeState(state: PageState): string {
  const params = new URLSearchParams();
  const names: Record<keyof PageState, string> = { tab: "tab", view: "view", season: "season", sport: "sport", collegeId: "college", kind: "kind", status: "status", date: "date" };
  for (const key of Object.keys(names) as (keyof PageState)[]) {
    const value = state[key];
    if (value && value !== DEFAULTS[key]) params.set(names[key], value);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

// ── The page ────────────────────────────────────────────────────────────────

function GamesPage() {
  const { viewer, loading: sessionLoading } = useSession();
  const { currentSeason, pastSeasonIds } = useSeason();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useMemo(() => readState(params), [params]);
  const change = useCallback(
    (changes: Partial<PageState>) => router.replace(pathname + writeState({ ...state, ...changes }), { scroll: false }),
    [router, pathname, state],
  );

  const seasonId = state.season ?? currentSeason?.id ?? null;
  const isCurrent = seasonId !== null && seasonId === currentSeason?.id;
  const season = useSeasonDetail(seasonId);
  const sportOf = useMemo(() => new Map((season?.sports ?? []).map((sport) => [sport.id, sport])), [season]);
  const brackets = useSeasonBrackets(viewer ? seasonId : null);
  const competition = useCallback(
    (game: Match) => competitionOf(game, sportOf.get(game.sportId), game.bracketId ? brackets?.get(game.bracketId) : undefined),
    [sportOf, brackets],
  );

  const nowMs = useNow();
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const today = easternDate(now);
  // The list opens on today (the current season), on a past season's first week, or on the day picked.
  const anchor: EasternDate = state.date ?? (isCurrent ? today : (season?.mvpWeekOne ?? `${season?.startYear ?? today.slice(0, 4)}-09-01`));

  // The viewer's entries this season mark their games (Signed up, ✓, ✓✓).
  const [myEntries, setMyEntries] = useState<Map<string, MyMatch["mine"]>>(new Map());
  useEffect(() => {
    if (!viewer || !seasonId) return;
    let live = true;
    fetchMyMatches({ seasonId }).then(
      ({ items }) => live && setMyEntries(new Map(items.map((m) => [m.id, m.mine]))),
      (err) => console.error("Failed to load your games:", err),
    );
    return () => {
      live = false;
    };
  }, [viewer, seasonId]);

  // What the list asks for, from the tab and the filters; null while the tab has nothing to show.
  const filter = useMemo((): ListFilter | null => {
    const chosen = { sportId: state.sport || undefined, kind: state.kind || undefined, status: state.status || undefined };
    if (state.tab === "favorites") {
      const favorites = viewer?.favorites;
      if (!favorites || (favorites.sportIds.length === 0 && favorites.collegeIds.length === 0)) return null;
      return {
        ...chosen,
        sportId: undefined,
        collegeIds: favorites.collegeIds.length > 0 ? favorites.collegeIds : undefined,
        sportIds: favorites.sportIds.length > 0 ? favorites.sportIds : undefined,
      };
    }
    if (state.tab === "college") return viewer?.collegeId ? { ...chosen, collegeId: viewer.collegeId } : null;
    return { ...chosen, collegeId: state.collegeId || undefined };
  }, [state, viewer]);

  if (sessionLoading) return <LoadingScreen />;
  if (!viewer) return <SignInRequired heading="Games" message="Sign in to see the games." />;
  if (!currentSeason || !seasonId || !season || !brackets) return <LoadingScreen />;

  const emptyMessage =
    state.tab === "college" ? "No games for your college here." : state.tab === "favorites" ? "No games of your favorites here." : "No games here. Try another day, sport or filter.";

  return (
    <div className="min-h-screen">
      <PageHeading heading="Games" />
      <div className="mt-20 md:mt-16 px-3 sm:px-6 max-w-3xl mx-auto pb-10 space-y-4">
        <Toolbar
          seasonId={seasonId}
          currentSeasonId={currentSeason.id}
          pastSeasonIds={pastSeasonIds}
          date={anchor}
          showToday={!isCurrent || anchor !== today}
          view={state.view}
          onSeason={(id) => change({ season: id === currentSeason.id ? null : id, date: null })}
          onToday={() => change({ season: null, date: null })}
          onDate={(date) => change({ date: date && !(isCurrent && date === today) ? date : null })}
          onView={(view) => change({ view })}
        />
        {state.tab !== "favorites" && <SportChips sports={season.sports} term={season.currentTerm} value={state.sport} onChange={(sport) => change({ sport })} />}
        <Tabs value={state.tab} onChange={(tab) => change({ tab })} college={collegeName(viewer.collegeId)} />
        {state.tab === "all" && <Filters value={state} onChange={(filters) => change(filters)} />}
        {filter === null ? (
          state.tab === "favorites" ? (
            <Notice>Star a sport or a college to see its games here.</Notice>
          ) : (
            <Notice>
              Your college isn&apos;t set yet.{" "}
              <Link href="/profile" className="underline">
                Set it on your profile
              </Link>
              .
            </Notice>
          )
        ) : state.view === "day" ? (
          <DayView
            seasonId={seasonId}
            startYear={season.startYear}
            day={anchor}
            onDay={(date) => change({ date: isCurrent && date === today ? null : date })}
            filter={filter}
            competitionOf={competition}
            myEntries={myEntries}
            now={now}
          />
        ) : (
          <GamesList
            seasonId={seasonId}
            filter={filter}
            anchor={anchor}
            competitionOf={competition}
            myEntries={myEntries}
            now={now}
            refresh={isCurrent && anchor === today}
            emptyMessage={emptyMessage}
          />
        )}
      </div>
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

interface ToolbarProps {
  seasonId: string;
  currentSeasonId: string;
  pastSeasonIds: string[];
  date: EasternDate;
  showToday: boolean;
  view: View;
  onSeason: (seasonId: string) => void;
  onToday: () => void;
  onDate: (date: string) => void;
  onView: (view: View) => void;
}

/** The season, a Today button, a day to jump to, and the List / Day switch. */
function Toolbar({ seasonId, currentSeasonId, pastSeasonIds, date, showToday, view, onSeason, onToday, onDate, onView }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <GlassDropdown
        placeholder="Season"
        value={seasonId}
        options={[
          { value: currentSeasonId, label: `${currentSeasonId} (Current)` },
          ...pastSeasonIds.filter((id) => id !== currentSeasonId).map((id) => ({ value: id, label: id })),
        ]}
        onChange={onSeason}
        allowReset={false}
      />
      {showToday && (
        <button type="button" onClick={onToday} className={chipClass(false)}>
          Today
        </button>
      )}
      <label className="text-xs text-gray-500 dark:text-gray-400">
        <span className="sr-only">Jump to a day</span>
        <input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className="rounded-full border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1 text-xs text-gray-700 dark:text-gray-200"
        />
      </label>
      <div className="ml-auto inline-flex rounded-full border border-gray-300 dark:border-gray-700 p-0.5" role="group" aria-label="View">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => onView(v)}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${view === v ? "bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900" : "text-gray-600 dark:text-gray-300"}`}
          >
            {v === "list" ? "List" : "Day"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Tabs({ value, onChange, college }: { value: Tab; onChange: (tab: Tab) => void; college: string | null }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "favorites", label: "Favorites ★" },
    { id: "college", label: college ?? "My college" },
  ];
  return (
    <div className="flex gap-1 bg-gray-200 dark:bg-gray-950 rounded-xl p-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
            value === tab.id ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** The Filters button with the active filters as chips, and the panel when open. */
function Filters({ value, onChange }: { value: SheetFilters; onChange: (value: SheetFilters) => void }) {
  const [open, setOpen] = useState(false);
  const active = [
    value.collegeId && (collegeName(value.collegeId) ?? value.collegeId),
    KINDS.find((k) => k.value === value.kind)?.label,
    STATUSES.find((s) => s.value === value.status)?.label,
  ].filter((label): label is string => !!label);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={chipClass(open)}>
          Filters{active.length > 0 && ` · ${active.length}`}
        </button>
        {active.map((label) => (
          <span key={label} className="px-2 py-1 rounded-full text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
            {label}
          </span>
        ))}
        {active.length > 0 && (
          <button type="button" onClick={() => onChange(NO_FILTERS)} className="text-xs text-gray-500 dark:text-gray-400 underline">
            Clear
          </button>
        )}
      </div>
      {open && <FiltersSheet value={value} onChange={onChange} />}
    </div>
  );
}

const Notice = ({ children }: { children: ReactNode }) => (
  <p className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{children}</p>
);

/** useSearchParams needs a Suspense boundary around the page. */
export default function GamesPageWithSuspense() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GamesPage />
    </Suspense>
  );
}
