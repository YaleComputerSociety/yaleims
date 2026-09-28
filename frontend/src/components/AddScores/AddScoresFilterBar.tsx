"use client";

import React from "react";
import { FaSearch } from "react-icons/fa";
import GlassDropdown, {
  GlassDropdownOption,
} from "@src/components/ui/GlassDropdown";

export type AddScoresSortOrder = "oldest" | "newest";

interface AddScoresFilterBarProps {
  sportOptions: GlassDropdownOption[];
  collegeOptions: GlassDropdownOption[];
  sportFilter: string;
  collegeFilter: string;
  search: string;
  sortOrder: AddScoresSortOrder;
  onSportChange: (sport: string) => void;
  onCollegeChange: (college: string) => void;
  onSearchChange: (search: string) => void;
  onSortOrderChange: (sortOrder: AddScoresSortOrder) => void;
}

const AddScoresFilterBar: React.FC<AddScoresFilterBarProps> = ({
  sportOptions,
  collegeOptions,
  sportFilter,
  collegeFilter,
  search,
  sortOrder,
  onSportChange,
  onCollegeChange,
  onSearchChange,
  onSortOrderChange,
}) => {
  const hasFilters = !!(sportFilter || collegeFilter || search);

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
      <GlassDropdown
        placeholder="Oldest first"
        value={sortOrder}
        options={[
          { value: "oldest", label: "Oldest first" },
          { value: "newest", label: "Newest first" },
        ]}
        onChange={(v) => onSortOrderChange(v as AddScoresSortOrder)}
        allowReset={false}
      />

      <div className="relative">
        <FaSearch
          size={10}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search match ID"
          className="pl-7 pr-3 py-1.5 w-40 text-xs font-semibold rounded-full border bg-gray-100/80 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-300/60 dark:border-white/10 focus:outline-none focus:border-blue-500/60"
        />
      </div>

      {/* Clear button */}
      {hasFilters && (
        <button
          onClick={() => {
            onSportChange("");
            onCollegeChange("");
            onSearchChange("");
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-full border border-white/15 dark:border-white/10 text-gray-500 dark:text-gray-400 bg-white/10 dark:bg-white/5 backdrop-blur-md hover:bg-white/20 dark:hover:bg-white/10 transition-all"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default AddScoresFilterBar;
