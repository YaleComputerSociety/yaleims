"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageHeading from "@/components/layout/PageHeading";
import Link from "next/link";
import { useSeason, useSeasonDetail } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import { useStandings } from "@/hooks/useStandings";
import { useTournamentNames } from "@/hooks/useTournamentNames";
import { fetchSeasonMatches, type Match } from "@/lib/api/matches";
import { fetchMyMatches, type MyMatch } from "@/lib/api/me";
import { COLLEGES, collegeName } from "@/lib/colleges";
import GameCard, { getMatchStatus } from "@/components/games/GameCard";
import DateScroller from "@/components/games/DateScroller";
import GamesFilterBar from "@/components/games/GamesFilterBar";
import FilterStatsCard, { seasonStats } from "@/components/games/FilterStatsCard";
import { EmptyState, SkeletonList, type GamesTab as Tab } from "@/components/games/GameListStates";
import { FaCalendarAlt, FaCalendarDay } from "react-icons/fa";
import { MdSportsScore, MdSchedule, MdErrorOutline } from "react-icons/md";
import { BsCollection } from "react-icons/bs";
import GlassDropdown from "@/components/ui/GlassDropdown";
import { signInUrl } from "@/lib/api/auth";
import type { RosterEntry } from "@/lib/api/roster";

// ─── types ────────────────────────────────────────────────────────────────────
interface TabConfig {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: "all",      label: "All",      icon: <BsCollection size={14} /> },
  { id: "upcoming", label: "Live & Upcoming", icon: <MdSchedule size={14} /> },
  { id: "scored",   label: "Scored",   icon: <MdSportsScore size={14} /> },
  { id: "unscored", label: "Unscored", icon: <MdErrorOutline size={14} /> },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return toYMD(a) === toYMD(b);
}

function groupByTime(matches: Match[]): Map<string, Match[]> {
  const map = new Map<string, Match[]>();
  matches.forEach((m) => {
    const key = new Date(m.startsAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  });
  return map;
}

/** Sep 1 of the first year in "YYYY-YYYY" */
function seasonStartDate(seasonYear: string): Date {
  const year = parseInt(seasonYear.split("-")[0], 10);
  return new Date(year, 8, 1); // September 1
}

/** Jun 30 of the second year, capped at 60 days from now for the current season */
function seasonEndDate(seasonYear: string, isCurrent: boolean): Date {
  const year = parseInt(seasonYear.split("-")[1], 10);
  const end = new Date(year, 5, 30); // June 30
  if (isCurrent) {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    return future < end ? future : end;
  }
  return end;
}



// ─── page ─────────────────────────────────────────────────────────────────────
const GamesPage: React.FC = () => {
  const searchParams = useSearchParams();
  const { currentSeason, pastSeasonIds } = useSeason();
  const defaultSeasonYear = currentSeason?.id ?? "";

  // ── season selector (the current season until one is picked) ─────────────────
  const [pickedSeason, setSelectedSeason] = useState<string | null>(null);
  const selectedSeason = pickedSeason ?? defaultSeasonYear;
  const isCurrentSeason = selectedSeason === defaultSeasonYear;
  const sports = useSeasonDetail(selectedSeason || null)?.sports;

  const minDate = useMemo(() => seasonStartDate(selectedSeason), [selectedSeason]);
  const maxDate = useMemo(
    () => seasonEndDate(selectedSeason, isCurrentSeason),
    [selectedSeason, isCurrentSeason]
  );

  // ── the whole season's games, once per season ───────────────────────────────
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [seasonLoading, setSeasonLoading] = useState(true);

  useEffect(() => {
    if (!selectedSeason) return;
    let live = true;
    setSeasonLoading(true);
    fetchSeasonMatches(selectedSeason)
      .then(
        ({ items }) => live && setAllMatches(items),
        (err) => {
          console.error("Failed to fetch season matches:", err);
          if (live) setAllMatches([]);
        }
      )
      .finally(() => live && setSeasonLoading(false));
    return () => {
      live = false;
    };
  }, [selectedSeason]);

  // The standings (for a college's record) and the tournaments (for the badges).
  const standings = useStandings(selectedSeason || null).colleges;
  const tournamentOf = useTournamentNames(allMatches);
  const sportOf = useMemo(() => new Map((sports ?? []).map((sport) => [sport.id, sport])), [sports]);

  // ── dates that have at least one game (for DateScroller dots) ────────────────
  const highlightedDates = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    allMatches.forEach((m) => s.add(toYMD(new Date(m.startsAt))));
    return s;
  }, [allMatches]);

  // ── auto-jump to nearest upcoming date with games on season/data change ──────
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Ref to skip the auto-jump once (used by goToToday)
  const skipNextAutoJump = useRef(false);

  useEffect(() => {
    if (highlightedDates.size === 0) return;
    if (skipNextAutoJump.current) {
      skipNextAutoJump.current = false;
      return;
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const gameDates = [...highlightedDates]
      .map((ymd) => new Date(`${ymd}T00:00:00`))
      .sort((a, b) => a.getTime() - b.getTime());
    if (isCurrentSeason) {
      // For the current season: jump to the nearest upcoming game date
      const upcoming = gameDates.find((d) => d >= now);
      setSelectedDate(upcoming ?? gameDates[gameDates.length - 1]);
    } else {
      // For past seasons: jump to the first game of the season
      setSelectedDate(gameDates[0]);
    }
  }, [highlightedDates, isCurrentSeason]);

  // ── user sign-up state ────────────────────────────────────────────────────────
  const { viewer } = useSession();
  // The games the user signed up for, by id, with their entry's status. Until
  // these land we can't tell sign-up state apart from not-signed-up, so the
  // cards show a skeleton rather than flashing "Sign Up" at someone already playing.
  const [myEntries, setMyEntries] = useState<Map<string, MyMatch["mine"]>>(new Map());
  const [userMatchesLoading, setUserMatchesLoading] = useState(true);

  useEffect(() => {
    if (!viewer || !selectedSeason) {
      setMyEntries(new Map());
      setUserMatchesLoading(!!viewer); // signed in: waiting for the season
      return;
    }
    let live = true;
    setUserMatchesLoading(true);
    fetchMyMatches({ seasonId: selectedSeason })
      .then(
        ({ items }) => live && setMyEntries(new Map(items.map((m) => [m.id, m.mine]))),
        (err) => console.error("Error fetching user matches:", err)
      )
      .finally(() => live && setUserMatchesLoading(false));
    return () => {
      live = false;
    };
  }, [viewer, selectedSeason]);

  const handleSignUpStatusChange = useCallback((matchId: string, entry: RosterEntry | null) => {
    setMyEntries((prev) => {
      const next = new Map(prev);
      if (entry) next.set(matchId, { captainStatus: entry.captainStatus, present: entry.present === true, underReview: false });
      else next.delete(matchId);
      return next;
    });
  }, []);

  // ── filter / tab state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [sportFilter, setSportFilter] = useState<string>("");
  const [collegeFilter, setCollegeFilter] = useState<string>("");

  // Sync college filter from URL (e.g. when navigating from leaderboard)
  useEffect(() => {
    const college = searchParams.get("college");
    setCollegeFilter(college ? decodeURIComponent(college) : "");
  }, [searchParams]);

  // ── matches for the selected day (client-side filter) ───────────────────────
  const dayMatches = useMemo<Match[]>(
    () => allMatches.filter((m) => isSameDay(new Date(m.startsAt), selectedDate)),
    [allMatches, selectedDate]
  );

  // The filters name a sport and a college; the games refer to them by id.
  const sportFilterId = sports?.find((sport) => sport.name === sportFilter)?.id ?? null;
  const collegeFilterId = COLLEGES.find((college) => college.name === collegeFilter)?.id ?? null;

  // ── tab + sport/college filtered list ────────────────────────────────────────
  const displayMatches = useMemo<Match[]>(() => {
    let result = dayMatches.filter((m) => {
      if (sportFilter && m.sportId !== sportFilterId) return false;
      if (
        collegeFilter &&
        collegeName(m.homeCollegeId) !== collegeFilter &&
        collegeName(m.awayCollegeId) !== collegeFilter
      )
        return false;
      return true;
    });
    if (activeTab === "upcoming")
      result = result.filter((m) => {
        const s = getMatchStatus(m);
        return s === "upcoming" || s === "live";
      });
    else if (activeTab === "scored") result = result.filter((m) => m.result);
    else if (activeTab === "unscored") result = result.filter((m) => getMatchStatus(m) === "completed" && !m.result);
    // Live games float to top
    return [...result].sort((a, b) => {
      const sa = getMatchStatus(a);
      const sb = getMatchStatus(b);
      if (sa === "live" && sb !== "live") return -1;
      if (sb === "live" && sa !== "live") return 1;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
  }, [dayMatches, activeTab, sportFilter, sportFilterId, collegeFilter]);

  const liveCount = useMemo(
    () => dayMatches.filter((m) => getMatchStatus(m) === "live").length,
    [dayMatches]
  );

  const groupedByTime = useMemo(() => groupByTime(displayMatches), [displayMatches]);

  // ── filter stats (season-wide, for the stats card) ─────────────────────────────
  const filterStats = useMemo(
    () =>
      seasonStats(
        allMatches,
        { collegeId: collegeFilterId, collegeName: collegeFilter, sportId: sportFilterId, sportName: sportFilter },
        standings
      ),
    [allMatches, collegeFilter, collegeFilterId, sportFilter, sportFilterId, standings]
  );

  // ── handlers ──────────────────────────────────────────────────────────────────
  const handleCollegeClick = (college: string) =>
    setCollegeFilter((prev) => (prev === college ? "" : college));

  const handleSportClick = (sport: string) =>
    setSportFilter((prev) => (prev === sport ? "" : sport));

  const handleSportChange = useCallback(
    (newSport: string) => {
      setSportFilter(newSport);
      // Jump to the sport's first game (the list is by start).
      const sportId = sports?.find((sport) => sport.name === newSport)?.id;
      const first = newSport ? allMatches.find((m) => m.sportId === sportId) : undefined;
      if (first) {
        const firstDate = new Date(first.startsAt);
        firstDate.setHours(0, 0, 0, 0);
        setSelectedDate(firstDate);
      }
    },
    [allMatches, sports]
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setActiveTab("all");
  };

  const handleSeasonChange = (season: string) => {
    setSelectedSeason(season);
    setActiveTab("all");
    setSportFilter("");
    setCollegeFilter("");
  };

  const goToToday = () => {
    skipNextAutoJump.current = true;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    if (!isCurrentSeason) {
      setSelectedSeason(defaultSeasonYear);
      setSportFilter("");
      setCollegeFilter("");
    }
    setActiveTab("all");
  };

  // ── day label ─────────────────────────────────────────────────────────────────
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const yesterday = useMemo(() => { const d = new Date(today); d.setDate(d.getDate()-1); return d; }, [today]);
  const tomorrow  = useMemo(() => { const d = new Date(today); d.setDate(d.getDate()+1); return d; }, [today]);

  const dayLabel = isSameDay(selectedDate, today)
    ? "Today"
    : isSameDay(selectedDate, yesterday)
    ? "Yesterday"
    : isSameDay(selectedDate, tomorrow)
    ? "Tomorrow"
    : selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const hasUpcomingGames = useMemo(
    () => allMatches.some((m) => getMatchStatus(m) === "upcoming" || getMatchStatus(m) === "live"),
    [allMatches]
  );
  const showSignInPrompt = !viewer && isCurrentSeason && hasUpcomingGames;

  return (
    <div className="min-h-screen">
      <PageHeading heading="Games" />

      <div className="mt-20 md:mt-16 px-3 sm:px-6 max-w-6xl mx-auto pb-10">

        {/* ── Sign in prompt for unauthenticated users ────────────────────── */}
        {showSignInPrompt && (
          <div className="mb-4 rounded-xl border border-blue-500/30 dark:border-blue-400/30 bg-blue-500/10 dark:bg-blue-500/5 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Sign in to sign up for games and report score issues.
            </p>
            <Link
              href={signInUrl("/games")}
              prefetch={false}
              className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* ── Season selector + DateScroller ─────────────────────────────── */}
        <div className="mb-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Season
            </span>
            <GlassDropdown
              placeholder={defaultSeasonYear}
              value={selectedSeason}
              options={[
                { value: defaultSeasonYear, label: `${defaultSeasonYear} (Current)` },
                ...pastSeasonIds
                  .filter((y) => y !== defaultSeasonYear)
                  .map((y) => ({ value: y, label: y })),
              ]}
              onChange={handleSeasonChange}
              allowReset={false}
            />
            {/* Today button */}
            {(!isSameDay(selectedDate, today) || !isCurrentSeason) && (
              <button
                onClick={goToToday}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-400 dark:hover:text-gray-950 transition-all"
              >
                <FaCalendarDay size={10} />
                Today
              </button>
            )}
            {/* Legend */}
            <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                Has games
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                Today
              </span>
            </div>
          </div>

          {/* Date strip */}
          {seasonLoading ? (
            <div className="h-[76px] rounded-xl bg-gray-200/60 dark:bg-gray-900/60 animate-pulse" />
          ) : (
            <DateScroller
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              minDate={minDate}
              maxDate={maxDate}
              highlightedDates={highlightedDates}
            />
          )}
        </div>

        {/* ── Day label + live badge + filter bar ───────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <FaCalendarAlt className="text-blue-600 dark:text-blue-400" size={14} />
            <h2 className="text-base font-bold text-gray-800 dark:text-white">
              {dayLabel}
            </h2>
            {!seasonLoading && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {(sportFilter || collegeFilter || activeTab !== "all")
                  ? `· ${displayMatches.length} of ${dayMatches.length} game${dayMatches.length !== 1 ? "s" : ""}`
                  : `· ${dayMatches.length} game${dayMatches.length !== 1 ? "s" : ""}`}
              </span>
            )}
            {liveCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                {liveCount} LIVE
              </span>
            )}
          </div>
          <GamesFilterBar
            sports={sports ?? []}
            sportFilter={sportFilter}
            collegeFilter={collegeFilter}
            onSportChange={handleSportChange}
            onCollegeChange={setCollegeFilter}
          />
        </div>

        {/* ── Filter stats card (slides down when college or sport selected) ────── */}
        {filterStats && (
          <FilterStatsCard
            stats={filterStats}
            isLoading={seasonLoading}
            seasonYear={selectedSeason}
          />
        )}

        {/* ── Tab bar ──────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-5 bg-gray-200 dark:bg-gray-950 rounded-xl p-1">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-150
                ${
                  activeTab === id
                    ? "bg-gray-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
            >
              {icon}
              <span>{label}</span>
              {id === "upcoming" && liveCount > 0 && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white leading-none">
                  <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                  {liveCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Match list ─────────────────────────────────────────────────── */}
        {seasonLoading ? (
          <SkeletonList />
        ) : displayMatches.length === 0 ? (
          <EmptyState tab={activeTab} dayLabel={dayLabel} hasGamesOnDay={dayMatches.length > 0} sportFilter={sportFilter} collegeFilter={collegeFilter} onClearFilters={() => { setSportFilter(""); setCollegeFilter(""); setActiveTab("all"); }} />
        ) : (
          <div className="space-y-6">
            {[...groupedByTime.entries()].map(([timeKey, timeMatches]) => (
              <div key={timeKey}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {timeKey}
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {timeMatches.map((match) => (
                    <GameCard
                      key={match.id}
                      match={match}
                      sport={sportOf.get(match.sportId)}
                      tournament={tournamentOf(match)}
                      onCollegeClick={handleCollegeClick}
                      onSportClick={handleSportClick}
                      viewer={viewer}
                      isSignedUp={myEntries.has(match.id)}
                      mine={myEntries.get(match.id)}
                      signUpStatusLoading={userMatchesLoading}
                      onStatusChange={handleSignUpStatusChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function GamesPageFallback() {
  return (
    <div className="min-h-screen pt-20 px-6 flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Loading games…</div>
    </div>
  );
}

export default function GamesPageWithSuspense() {
  return (
    <Suspense fallback={<GamesPageFallback />}>
      <GamesPage />
    </Suspense>
  );
}
