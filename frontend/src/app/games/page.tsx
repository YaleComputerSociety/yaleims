"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import PageHeading from "@src/components/PageHeading";
import { Match } from "@src/types/components";
import { useSeason } from "@src/context/SeasonContext";
import { useUser } from "@src/context/UserContext";
import { toCollegeName, toCollegeAbbreviation, currentYear, getPlace } from "@src/utils/helpers";
import GameCard, { getMatchStatus } from "@src/components/Games/GameCard";
import DateScroller from "@src/components/Games/DateScroller";
import GamesFilterBar from "@src/components/Games/GamesFilterBar";
import { FaCalendarAlt, FaCalendarDay } from "react-icons/fa";
import { MdSportsScore, MdSchedule, MdErrorOutline } from "react-icons/md";
import { BsCollection } from "react-icons/bs";
import GlassDropdown from "@src/components/ui/GlassDropdown";

// ─── types ────────────────────────────────────────────────────────────────────
type Tab = "all" | "upcoming" | "scored" | "unscored";

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

/** Parse a match timestamp that may be an ISO string or Firestore {_seconds} object */
function parseTimestamp(ts: any): Date {
  if (typeof ts === "string") return new Date(ts);
  if (typeof ts === "number") return new Date(ts);
  if (ts && typeof ts._seconds === "number") return new Date(ts._seconds * 1000);
  if (ts && typeof ts.seconds === "number") return new Date(ts.seconds * 1000);
  return new Date(ts);
}

function isSameDay(a: Date, b: Date): boolean {
  return toYMD(a) === toYMD(b);
}

function groupByTime(matches: Match[]): Map<string, Match[]> {
  const map = new Map<string, Match[]>();
  matches.forEach((m) => {
    const key = new Date(m.timestamp).toLocaleTimeString("en-US", {
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
  const { currentSeason, pastSeasons } = useSeason();
  const defaultSeasonYear = currentSeason?.year ?? currentYear;
  const pastYears: string[] = pastSeasons?.years || [];

  // ── season selector ──────────────────────────────────────────────────────────
  const [selectedSeason, setSelectedSeason] = useState<string>(defaultSeasonYear);
  const isCurrentSeason = selectedSeason === defaultSeasonYear;

  const minDate = useMemo(() => seasonStartDate(selectedSeason), [selectedSeason]);
  const maxDate = useMemo(
    () => seasonEndDate(selectedSeason, isCurrentSeason),
    [selectedSeason, isCurrentSeason]
  );

  // ── fetch ALL matches for the selected season once ───────────────────────────
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [seasonLoading, setSeasonLoading] = useState(true);

  // ── fetch leaderboard (same source as standings page) for college stats ─────────
  type LeaderboardCollege = {
    id: string;
    name: string;
    games: number;
    wins: number;
    ties: number;
    losses: number;
    forfeits: number;
    points: number;
    rank: number;
  };
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardCollege[]>([]);

  useEffect(() => {
    const fetchAllMatches = async () => {
      setSeasonLoading(true);
      try {
        const params = new URLSearchParams({
          seasonId: selectedSeason,
          type: "index",
          pageIndex: "1",
          pageSize: "2000",
          sortOrder: "asc",
          scored: "all",
          college: "All",
          sport: "All",
        });
        const res = await fetch(`/api/functions/getMatchesv2?${params}`);
        const data = res.ok ? await res.json() : { matches: [] };
        setAllMatches(data.matches ?? []);
      } catch (err) {
        console.error("Failed to fetch season matches:", err);
        setAllMatches([]);
      } finally {
        setSeasonLoading(false);
      }
    };
    fetchAllMatches();
  }, [selectedSeason]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(
          `https://us-central1-yims-125a2.cloudfunctions.net/getLeaderboard?seasonId=${selectedSeason}`
        );
        const data = res.ok ? await res.json() : [];
        setLeaderboardData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
        setLeaderboardData([]);
      }
    };
    fetchLeaderboard();
  }, [selectedSeason]);

  // ── dates that have at least one game (for DateScroller dots) ────────────────
  const highlightedDates = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    allMatches.forEach((m) => {
      const d = parseTimestamp(m.timestamp);
      if (!isNaN(d.getTime())) s.add(toYMD(d));
    });
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
  const { user } = useUser();
  const [userMatches, setUserMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!user) { setUserMatches([]); return; }
    const controller = new AbortController();
    const fetchUserMatches = async () => {
      try {
        const res = await fetch(
          `/api/functions/getUserMatches?seasonId=${selectedSeason}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to fetch user matches");
        const data = (await res.json()) as Match[];
        setUserMatches(data);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "AbortError") {
          console.error("Error fetching user matches:", err);
        }
      }
    };
    fetchUserMatches();
    return () => controller.abort();
  }, [user, selectedSeason]);

  const signedUpIds = useMemo(() => {
    return new Set(
      userMatches.map((m) => `${m.id}::${parseTimestamp(m.timestamp).getTime()}`)
    );
  }, [userMatches]);

  const handleSignUpStatusChange = useCallback(
    (matchId: string, signed: boolean) => {
      setUserMatches((prev) => {
        if (signed) {
          const found = allMatches.find((m) => m.id === matchId);
          return found ? [...prev, found] : prev;
        }
        return prev.filter((m) => m.id !== matchId);
      });
    },
    [allMatches]
  );

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
    () => allMatches.filter((m) => isSameDay(parseTimestamp(m.timestamp), selectedDate)),
    [allMatches, selectedDate]
  );

  // ── tab + sport/college filtered list ────────────────────────────────────────
  const displayMatches = useMemo<Match[]>(() => {
    let result = dayMatches.filter((m) => {
      if (sportFilter && m.sport !== sportFilter) return false;
      if (
        collegeFilter &&
        toCollegeName[m.home_college] !== collegeFilter &&
        toCollegeName[m.away_college] !== collegeFilter
      )
        return false;
      return true;
    });
    if (activeTab === "upcoming")
      result = result.filter((m) => {
        const s = getMatchStatus(m);
        return s === "upcoming" || s === "live";
      });
    else if (activeTab === "scored")
      result = result.filter((m) => {
        const s = getMatchStatus(m);
        if (s !== "completed") return false;
        // exclude unscored games (past but no result)
        return m.winner !== null || (m.home_college_score ?? 0) > 0 || (m.away_college_score ?? 0) > 0 || m.forfeit;
      });
    else if (activeTab === "unscored")
      result = result.filter((m) => {
        const s = getMatchStatus(m);
        return s === "completed" && m.winner === null && (m.home_college_score ?? 0) === 0 && (m.away_college_score ?? 0) === 0 && !m.forfeit;
      });
    // Live games float to top
    return [...result].sort((a, b) => {
      const sa = getMatchStatus(a);
      const sb = getMatchStatus(b);
      if (sa === "live" && sb !== "live") return -1;
      if (sb === "live" && sa !== "live") return 1;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [dayMatches, activeTab, sportFilter, collegeFilter]);

  const liveCount = useMemo(
    () => dayMatches.filter((m) => getMatchStatus(m) === "live").length,
    [dayMatches]
  );

  const groupedByTime = useMemo(() => groupByTime(displayMatches), [displayMatches]);

  // ── filter stats (season-wide, for the stats card) ─────────────────────────────
  // When college-only: use leaderboard (same as standings page). When college+sport or sport-only: compute from matches.
  const filterStats = useMemo(() => {
    const hasCollege = !!collegeFilter;
    const hasSport = !!sportFilter;
    if (!hasCollege && !hasSport) return null;

    // Base filter: all matches in season, optionally filtered by sport
    let base = allMatches.filter((m) => {
      if (hasSport && m.sport !== sportFilter) return false;
      if (m.away_college === "Bye" || m.home_college === "Bye") return false;
      return true;
    });

    if (hasCollege) {
      const collegeAbbr = toCollegeAbbreviation[collegeFilter];
      if (!collegeAbbr) return null;
      base = base.filter(
        (m) => m.home_college === collegeAbbr || m.away_college === collegeAbbr
      );
    }

    const now = Date.now();
    const completed = base.filter((m) => {
      const hasResult =
        m.winner !== null ||
        (m.home_college_score ?? 0) > 0 ||
        (m.away_college_score ?? 0) > 0 ||
        m.forfeit;
      return hasResult;
    });
    const upcoming = base.filter((m) => parseTimestamp(m.timestamp).getTime() > now);

    // College-only: use leaderboard stats (same source as standings page)
    if (hasCollege && !hasSport) {
      const lbCollege = leaderboardData.find(
        (c) => c.name === collegeFilter || c.id === toCollegeAbbreviation[collegeFilter]
      );
      if (lbCollege) {
        const upcomingCount = base.filter(
          (m) => parseTimestamp(m.timestamp).getTime() > now
        ).length;
        const completedCount =
          (lbCollege.wins ?? 0) + (lbCollege.losses ?? 0) + (lbCollege.ties ?? 0);
        return {
          mode: "college" as const,
          collegeName: collegeFilter,
          sportName: undefined,
          totalGames: completedCount + upcomingCount,
          wins: lbCollege.wins ?? 0,
          losses: lbCollege.losses ?? 0,
          ties: lbCollege.ties ?? 0,
          forfeits: lbCollege.forfeits ?? 0,
          completed: completedCount,
          upcoming: upcomingCount,
          rank: lbCollege.rank,
          points: lbCollege.points ?? 0,
        };
      }
    }

    // College+sport or sport-only: compute from matches
    if (hasCollege) {
      const collegeAbbr = toCollegeAbbreviation[collegeFilter];
      let wins = 0;
      let losses = 0;
      let ties = 0;
      let forfeits = 0;
      const isDraw = (m: Match) =>
        m.winner === "Draw" ||
        m.winner === "Tie" ||
        (!m.forfeit &&
          Number(m.home_college_score ?? 0) === Number(m.away_college_score ?? 0));
      completed.forEach((m) => {
        if (m.home_college !== collegeAbbr && m.away_college !== collegeAbbr) return;
        const won = m.winner === collegeAbbr;
        const drew = isDraw(m);
        const lost =
          m.winner !== null &&
          m.winner !== "Tie" &&
          m.winner !== "Draw" &&
          m.winner !== "Default" &&
          m.winner !== collegeAbbr;
        if (won) wins++;
        if (drew) ties++;
        if (lost) {
          losses++;
          if (m.forfeit) forfeits++;
        }
      });
      const lbCollege = leaderboardData.find(
        (c) => c.name === collegeFilter || c.id === collegeAbbr
      );
      return {
        mode: "college" as const,
        collegeName: collegeFilter,
        sportName: hasSport ? sportFilter : undefined,
        totalGames: base.length,
        wins,
        losses,
        ties,
        forfeits,
        completed: completed.length,
        upcoming: upcoming.length,
        rank: lbCollege?.rank,
        points: lbCollege?.points ?? 0,
      };
    }

    // Sport only
    const forfeitCount = base.filter((m) => m.forfeit).length;
    const tieCount = completed.filter(
      (m) =>
        m.winner === "Draw" ||
        m.winner === "Tie" ||
        (!m.forfeit &&
          Number(m.home_college_score ?? 0) === Number(m.away_college_score ?? 0))
    ).length;
    return {
      mode: "sport" as const,
      sportName: sportFilter,
      totalGames: base.length,
      completed: completed.length,
      upcoming: upcoming.length,
      ties: tieCount,
      forfeits: forfeitCount,
    };
  }, [allMatches, collegeFilter, sportFilter, leaderboardData]);

  // ── handlers ──────────────────────────────────────────────────────────────────
  const handleCollegeClick = (college: string) =>
    setCollegeFilter((prev) => (prev === college ? "" : college));

  const handleSportClick = (sport: string) =>
    setSportFilter((prev) => (prev === sport ? "" : sport));

  const handleSportChange = useCallback(
    (newSport: string) => {
      setSportFilter(newSport);
      if (newSport && allMatches.length > 0) {
        const sportMatches = allMatches.filter((m) => m.sport === newSport);
        if (sportMatches.length > 0) {
          const dates = sportMatches
            .map((m) => parseTimestamp(m.timestamp))
            .filter((d) => !isNaN(d.getTime()));
          if (dates.length > 0) {
            dates.sort((a, b) => a.getTime() - b.getTime());
            const firstDate = new Date(dates[0]);
            firstDate.setHours(0, 0, 0, 0);
            setSelectedDate(firstDate);
          }
        }
      }
    },
    [allMatches]
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

  return (
    <div className="min-h-screen">
      <PageHeading heading="Games" />

      <div className="mt-20 md:mt-16 px-3 sm:px-6 max-w-6xl mx-auto pb-10">

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
                ...pastYears
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
                      onCollegeClick={handleCollegeClick}
                      onSportClick={handleSportClick}
                      user={user}
                      isSignedUp={signedUpIds.has(`${match.id}::${parseTimestamp(match.timestamp).getTime()}`)}
                      onStatusChange={handleSignUpStatusChange}
                      seasonId={selectedSeason}
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

// ─── filter stats card (slide-down) ───────────────────────────────────────────
type FilterStats =
  | {
      mode: "college";
      collegeName: string;
      sportName?: string;
      totalGames: number;
      wins: number;
      losses: number;
      ties: number;
      forfeits: number;
      completed: number;
      upcoming: number;
      rank?: number;
      points?: number;
    }
  | {
      mode: "sport";
      sportName: string;
      totalGames: number;
      completed: number;
      upcoming: number;
      ties: number;
      forfeits: number;
    };

const FilterStatsCard: React.FC<{
  stats: FilterStats;
  isLoading: boolean;
  seasonYear?: string;
}> = ({ stats, isLoading, seasonYear }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(id);
  }, []);

  if (isLoading) return null;

  const hasRankAndPoints =
    stats.mode === "college" &&
    stats.rank != null &&
    stats.points != null;
  const headerTitle =
    stats.mode === "college"
      ? stats.sportName
        ? `${stats.collegeName} · ${stats.sportName}`
        : stats.collegeName
      : stats.sportName;

  const headerText = hasRankAndPoints
    ? `${seasonYear ? `${seasonYear}: ` : ""}${headerTitle} in ${getPlace(stats.rank)} place with ${stats.points} points`
    : `${headerTitle} — Season Stats`;

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-out"
      style={{
        maxHeight: mounted ? 400 : 0,
        opacity: mounted ? 1 : 0,
      }}
    >
      <div className="mb-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <MdSportsScore size={16} className="text-blue-500" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">
            {headerText}
          </h3>
        </div>
        <div className="flex flex-wrap gap-4 p-4">
          <StatPill label="Total games" value={stats.totalGames} />
          <StatPill label="Completed" value={stats.completed} />
          {stats.mode === "college" && (
            <>
              <StatPill label="Wins" value={stats.wins} variant="win" />
              <StatPill label="Ties" value={stats.ties} variant="tie" />
              <StatPill label="Losses" value={stats.losses} variant="loss" />
              <StatPill label="Forfeits" value={stats.forfeits} variant="forfeit" />
            </>
          )}
          {stats.mode === "sport" && (
            <>
              <StatPill label="Ties" value={stats.ties} variant="tie" />
              <StatPill label="Upcoming" value={stats.upcoming} />
              <StatPill label="Forfeits" value={stats.forfeits} variant="forfeit" />
            </>
          )}
          {stats.mode === "college" && (
            <StatPill label="Upcoming" value={stats.upcoming} />
          )}
        </div>
      </div>
    </div>
  );
};

const StatPill: React.FC<{
  label: string;
  value: number;
  variant?: "win" | "loss" | "tie" | "forfeit";
}> = ({ label, value, variant }) => (
  <div
    className={`flex flex-col items-center justify-center min-w-[4rem] px-3 py-1.5 rounded-lg text-xs font-semibold ${
      variant === "win"
        ? "bg-green-400/30 dark:bg-green-600/30 text-green-800 dark:text-green-200"
        : variant === "loss"
        ? "bg-red-400/30 dark:bg-red-600/30 text-red-800 dark:text-red-200"
        : variant === "tie"
        ? "bg-yellow-300/40 dark:bg-yellow-600/30 text-yellow-800 dark:text-yellow-200"
        : variant === "forfeit"
        ? "bg-slate-400/30 dark:bg-slate-600/30 text-slate-800 dark:text-slate-200"
        : "bg-gray-200/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200"
    }`}
  >
    <span className="text-base font-bold">{value}</span>
    <span className="text-[10px] uppercase tracking-wide opacity-90">{label}</span>
  </div>
);

// ─── skeleton loader ──────────────────────────────────────────────────────────
const SkeletonCard: React.FC = () => (
  <div className="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-pulse">
    <div className="px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-9" />
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm bg-gray-200 dark:bg-gray-700" />
          <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm bg-gray-200 dark:bg-gray-700" />
          <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex justify-between">
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  </div>
);

const SkeletonList: React.FC = () => (
  <div className="space-y-6">
    {[0, 1].map((g) => (
      <div key={g}>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ─── empty state ──────────────────────────────────────────────────────────────
const EmptyState: React.FC<{
  tab: Tab;
  dayLabel: string;
  hasGamesOnDay: boolean;
  sportFilter?: string;
  collegeFilter?: string;
  onClearFilters?: () => void;
}> = ({
  tab,
  dayLabel,
  hasGamesOnDay,
  sportFilter,
  collegeFilter,
  onClearFilters,
}) => {
  const hasFilters = !!(sportFilter || collegeFilter);
  const filterDesc = [sportFilter, collegeFilter].filter(Boolean).join(" + ");

  const messages: Record<Tab, { title: string; sub: string }> = {
    all: {
      title: hasGamesOnDay ? "No matching games" : "No games scheduled",
      sub: hasGamesOnDay
        ? hasFilters
          ? `No ${filterDesc} games on this day.`
          : "No games match your current filters."
        : `No games on ${dayLabel}. Try a date with a yellow dot.`,
    },
    upcoming: {
      title: hasGamesOnDay ? "No matching upcoming games" : "No upcoming games",
      sub: hasGamesOnDay
        ? hasFilters
          ? `No upcoming ${filterDesc} games on this day.`
          : "All games on this day are already finished."
        : `No upcoming games on ${dayLabel}.`,
    },
    scored: {
      title: hasGamesOnDay ? "No matching scores" : "No scores yet",
      sub: hasGamesOnDay
        ? hasFilters
          ? `No scored ${filterDesc} games on this day.`
          : "Games on this day haven't been scored yet."
        : `No completed games on ${dayLabel}.`,
    },
    unscored: {
      title: hasGamesOnDay ? "No unscored games" : "No games to score",
      sub: hasGamesOnDay
        ? hasFilters
          ? `No unscored ${filterDesc} games on this day.`
          : "All games on this day have been scored."
        : `No unscored games on ${dayLabel}.`,
    },
  };

  const { title, sub } = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">🏆</div>
      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">{sub}</p>
      {hasGamesOnDay && (hasFilters || tab !== "all") && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-4 px-4 py-1.5 text-xs font-semibold rounded-full border border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-400 dark:hover:text-gray-950 transition-all"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};

export default GamesPage;
