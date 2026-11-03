"use client";

import React from "react";

interface TournamentBadgeProps {
  /** The game's tournament (hooks/useTournamentNames); undefined for other games, which render nothing. */
  name?: string;
  /** Drops the name and keeps just the trophy, for narrow columns. */
  compact?: boolean;
  className?: string;
}

/**
 * Marks a match as belonging to a tournament, which matters because tournament
 * games award placement points on top of the usual points for a win.
 */
const TournamentBadge: React.FC<TournamentBadgeProps> = ({ name, compact = false, className = "" }) => {
  if (name === undefined) return null;

  return (
    <span
      title={name || "Tournament match"}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-400/20 ${className}`}
    >
      <span aria-hidden="true">🏆</span>
      {!compact && <span className="max-w-[10rem] truncate">{name || "Tournament"}</span>}
    </span>
  );
};

export default TournamentBadge;
