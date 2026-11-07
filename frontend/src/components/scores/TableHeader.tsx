import React from "react";
import { COLLEGES } from "@/lib/colleges";
import type { Sport } from "@/lib/api/seasons";
import type { Filters } from "@/context/FiltersContext";

interface TableHeaderProps {
  handleFilterChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  filter: Filters;
  sports: Sport[];
  sortOrder: string;
  handleSortOrderChange: (newSortOrder: string) => void;
}

/** Filters for the selected season's results. */
const TableHeader: React.FC<TableHeaderProps> = ({
  handleFilterChange,
  filter,
  sports,
  sortOrder,
  handleSortOrderChange,
}) => {
  return (
  <div className="flex flex-wrap px-2 py-2 rounded-md justify-center justify-self-center">
    {/* Date/Time Column with Dropdown Filter */}
    <div className="py-1 px-1 text-sm font-medium rounded-md uppercase md:tracking-wider hover:bg-yellow-400">
      <div>
        <select
          name="date"
          onChange={handleFilterChange}
          className="text-sm  rounded-md py-1 px-1 bg-white dark:bg-black"
          value={filter.date}
        >
          <option value="AllPast">All Season Results</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last7days">Last 7 Days</option>
          <option value="last30days">Last 30 Days</option>
          <option value="last60days">Last 60 Days</option>
        </select>
      </div>
    </div>

    {/* Colleges Column with Dropdown Filter */}
    <div className="py-1 px-1 text-sm font-medium rounded-md uppercase md:tracking-wider hover:bg-yellow-400">
      <div>
        <select
          name="college"
          onChange={handleFilterChange}
          className="text-sm  rounded-md py-1 px-1 bg-white dark:bg-black"
          value={filter.college}
        >
          <option value="All">All Colleges</option>
          {COLLEGES.map((college) => (
            <option key={college.id} value={college.id}>
              {college.name}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Sport Column with Dropdown Filter */}
    <div className="py-1 px-1 text-sm font-medium rounded-md uppercase md:tracking-wider hover:bg-yellow-400">
      <div>
        <select
          name="sport"
          onChange={handleFilterChange}
          className="text-sm  rounded-md py-1 px-1 bg-white dark:bg-black"
          value={filter.sport}
        >
          <option value="">All Sports</option>
          {sports.map((sport) => (
            <option key={sport.id} value={sport.name}>
              {sport.name}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Sort By Asc/Desc Filter */}
    <div className="pl-2 text-sm font-medium rounded-md">
      <fieldset>
        <div className="flex items-center space-x-4 mt-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="sortOrder"
              value="desc"
              checked={sortOrder === "desc"}
              onChange={(e) => handleSortOrderChange(e.target.value)}
              className="form-radio h-4 w-4 text-yellow-400 border-gray-300 bg-white dark:bg-black"
            />
            <span className="ml-2 text-sm ">desc</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="sortOrder"
              value="asc"
              checked={sortOrder === "asc"}
              onChange={(e) => handleSortOrderChange(e.target.value)}
              className="form-radio h-4 w-4 text-yellow-400 border-gray-300 bg-white dark:bg-black"
            />
            <span className="ml-2 text-sm">asc</span>
          </label>
        </div>
      </fieldset>
    </div>
  </div>
  );
};

export default TableHeader;
