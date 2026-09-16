"use client";

import React from "react";

interface TournamentBadgeProps {
  /** Undefined for ordinary season and playoff matches, which render nothing. */
  tournamentId?: string;
  /** Falls back to a generic label for matches created before names were stored. */
  tournamentName?: string;
  /** Drops the name and keeps just the trophy, for narrow columns. */
  compact?: boolean;
  className?: string;
}

/**
 * Marks a match as belonging to a tournament, which matters because tournament
 * games award placement points on top of the usual points for a win.
 */
const TournamentBadge: React.FC<TournamentBadgeProps> = ({
  tournamentId,
  tournamentName,
  compact = false,
  className = "",
}) => {
  if (!tournamentId) return null;

  return (
    <span
      title={tournamentName || "Tournament match"}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-400/20 ${className}`}
    >
      <span aria-hidden="true">🏆</span>
      {!compact && (
        <span className="max-w-[10rem] truncate">
          {tournamentName || "Tournament"}
        </span>
      )}
    </span>
  );
};

export default TournamentBadge;
