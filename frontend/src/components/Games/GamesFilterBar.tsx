"use client";

import React from "react";
import { colleges, sports } from "@src/utils/helpers";
import GlassDropdown from "@src/components/ui/GlassDropdown";

interface GamesFilterBarProps {
  sportFilter: string;
  collegeFilter: string;
  onSportChange: (sport: string) => void;
  onCollegeChange: (college: string) => void;
}

const GamesFilterBar: React.FC<GamesFilterBarProps> = ({
  sportFilter,
  collegeFilter,
  onSportChange,
  onCollegeChange,
}) => {
  const sportOptions = sports.map((s) => ({ value: s.name, label: s.name }));
  const collegeOptions = colleges.map((c) => ({ value: c.name, label: c.name }));

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
