"use client";
// The season stats of the games page's filters (a college, a sport, or both),
// and the card that slides down to show them.
import React, { useEffect, useState } from "react";
import { MdSportsScore } from "react-icons/md";
import type { Match } from "@/lib/api/matches";
import { getPlace } from "@/lib/format";
import type { CollegeDoc, WithId } from "@/types/firestore";

/**
 * The stats for the filters, from the season's games; a college alone takes
 * its record from the standings (as the home page shows it). Null without
 * filters.
 */
export function seasonStats(
  matches: Match[],
  filter: { collegeId: string | null; collegeName: string; sportId: string | null; sportName: string },
  standings: WithId<CollegeDoc>[]
): FilterStats | null {
  const { collegeId, collegeName, sportId, sportName } = filter;
  if (!collegeName && !sportName) return null;

  let base = sportName ? matches.filter((m) => m.sportId === sportId) : matches;
  if (collegeName) {
    if (!collegeId) return null;
    base = base.filter((m) => m.homeCollegeId === collegeId || m.awayCollegeId === collegeId);
  }
  const now = Date.now();
  const completed = base.filter((m) => m.result);
  const upcoming = base.filter((m) => new Date(m.startsAt).getTime() > now).length;
  const standing = collegeId ? standings.find((c) => c.id === collegeId) : undefined;

  if (collegeName && !sportName && standing) {
    const played = standing.wins + standing.losses + standing.ties;
    return {
      mode: "college",
      collegeName,
      totalGames: played + upcoming,
      wins: standing.wins,
      losses: standing.losses,
      ties: standing.ties,
      forfeits: standing.forfeits,
      completed: played,
      upcoming,
      rank: standing.rank,
      points: standing.points,
    };
  }

  if (collegeName) {
    const record = { wins: 0, losses: 0, ties: 0, forfeits: 0 };
    for (const { homeCollegeId, result } of completed) {
      const side = homeCollegeId === collegeId ? "home" : "away";
      if (result!.outcome === "draw") record.ties++;
      else if (result!.outcome === side) record.wins++;
      else if (result!.outcome !== "double_forfeit") {
        record.losses++;
        if (result!.forfeit) record.forfeits++;
      }
    }
    return {
      mode: "college",
      collegeName,
      sportName: sportName || undefined,
      totalGames: base.length,
      ...record,
      completed: completed.length,
      upcoming,
      rank: standing?.rank,
      points: standing?.points ?? 0,
    };
  }

  return {
    mode: "sport",
    sportName,
    totalGames: base.length,
    completed: completed.length,
    upcoming,
    ties: completed.filter((m) => m.result!.outcome === "draw").length,
    forfeits: base.filter((m) => m.result?.forfeit).length,
  };
}

export type FilterStats =
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

export default FilterStatsCard;
