"use client";
// The games list while it loads (skeleton cards) and when nothing matches (a
// message per tab and filter).
import React from "react";

/** The games page's tabs. */
export type GamesTab = "all" | "upcoming" | "scored" | "unscored";

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

export const SkeletonList: React.FC = () => (
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
export const EmptyState: React.FC<{
  tab: GamesTab;
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

  const messages: Record<GamesTab, { title: string; sub: string }> = {
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
