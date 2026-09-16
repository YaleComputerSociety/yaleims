"use client";

import React from "react";
import { Tournament } from "@src/types/components";
import { toCollegeName } from "@src/utils/helpers";

interface PlacementPanelProps {
  tournament: Tournament;
}

const PODIUM: {
  key: "first" | "second" | "third";
  label: string;
  medal: string;
  style: string;
}[] = [
  {
    key: "first",
    label: "1st",
    medal: "🥇",
    style:
      "from-yellow-100 to-amber-50 dark:from-yellow-600/30 dark:to-amber-500/10 border-yellow-300 dark:border-yellow-400/30",
  },
  {
    key: "second",
    label: "2nd",
    medal: "🥈",
    style:
      "from-gray-100 to-slate-50 dark:from-gray-500/30 dark:to-slate-500/10 border-gray-300 dark:border-gray-400/30",
  },
  {
    key: "third",
    label: "3rd",
    medal: "🥉",
    style:
      "from-orange-100 to-amber-50 dark:from-orange-700/30 dark:to-amber-700/10 border-orange-300 dark:border-orange-400/30",
  },
];

/**
 * Shows what the top three finishes are worth and, once the final and third
 * place game are scored, who claimed them. Placement points land on top of the
 * ordinary per-win points every tournament match already awards.
 */
const PlacementPanel: React.FC<PlacementPanelProps> = ({ tournament }) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-6 mb-6">
      <div className="rounded-2xl px-6 py-4 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md border border-blue-200/60 dark:border-blue-400/10 shadow-lg shadow-blue-100/50 dark:shadow-blue-500/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-blue-400 dark:text-gray-500 uppercase tracking-wide">
            Placement Points
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Awarded on top of points for each win
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {PODIUM.map(({ key, label, medal, style }) => {
            const college = tournament.placements?.[key];
            return (
              <div
                key={key}
                className={`rounded-xl border bg-gradient-to-br ${style} px-3 py-3 text-center`}
              >
                <div className="text-2xl leading-none mb-1">{medal}</div>
                <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  {label}
                </div>
                <div className="text-lg font-extrabold text-gray-900 dark:text-white">
                  {tournament.placement_points?.[key] ?? 0} pts
                </div>
                <div className="text-[11px] mt-1 font-medium text-gray-600 dark:text-gray-400 truncate">
                  {college ? toCollegeName[college] || college : "TBD"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlacementPanel;
