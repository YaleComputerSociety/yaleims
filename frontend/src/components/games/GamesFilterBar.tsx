"use client";

import React from "react";
import GlassDropdown from "@/components/ui/GlassDropdown";
import type { Sport } from "@/lib/api/seasons";
import { COLLEGES } from "@/lib/colleges";

interface GamesFilterBarProps {
  /** The season's sports, in display order. */
  sports: Sport[];
  sportFilter: string;
  collegeFilter: string;
  onSportChange: (sport: string) => void;
  onCollegeChange: (college: string) => void;
}

const GamesFilterBar: React.FC<GamesFilterBarProps> = ({
  sports,
  sportFilter,
  collegeFilter,
  onSportChange,
  onCollegeChange,
}) => {
  const sportOptions = sports.map((s) => ({ value: s.name, label: s.name }));
  const collegeOptions = COLLEGES.map((c) => ({ value: c.name, label: c.name }));

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <GlassDropdown
        placeholder="All Sports"
        value={sportFilter}
        options={sportOptions}
        onChange={onSportChange}
      />
      <GlassDropdown
        placeholder="All Colleges"
        value={collegeFilter}
        options={collegeOptions}
        onChange={onCollegeChange}
      />

      {/* Clear button */}
      {(sportFilter || collegeFilter) && (
        <button
          onClick={() => {
            onSportChange("");
            onCollegeChange("");
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-full border border-white/15 dark:border-white/10 text-gray-500 dark:text-gray-400 bg-white/10 dark:bg-white/5 backdrop-blur-md hover:bg-white/20 dark:hover:bg-white/10 transition-all"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default GamesFilterBar;
