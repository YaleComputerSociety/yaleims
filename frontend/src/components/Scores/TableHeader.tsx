import { TableHeaderProps } from "@src/types/components";
import React from "react";
import { colleges } from "@src/utils/helpers";

// list of options for college filter
const collegeOptions: Array<any> = [];

collegeOptions.push(
  <option key={"All"} value={"All"}>
    {"All Colleges"}
  </option>
);

colleges.map((college) =>
  collegeOptions.push(
    <option key={college.id} value={college.id}>
      {college.name}
    </option>
  )
);

// Updated TableHeader Component
const TableHeader: React.FC<TableHeaderProps> = ({
  handleFilterChange,
  filter,
  sortOrder,
  handleSortOrderChange,
}) => (
  <div className="flex flex-wrap px-2 py-2 rounded-md justify-center justify-self-center">
    {/* Date/Time Column with Dropdown Filter */}
    <div className="py-1 px-1 text-xs font-medium rounded-md uppercase md:tracking-wider hover:bg-yellow-400">
      <div>
        <select
          name="date"
          onChange={handleFilterChange}
          className="text-xs md:text-sm rounded-md py-1 px-1 dark:bg-black"
        >
          <option value="All">All Past Games</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last7days">Last 7 Days</option>
          <option value="last30days">Last 30 Days</option>
          <option value="last60days">Last 60 Days</option>
        </select>
      </div>
    </div>

    {/* Colleges Column with Dropdown Filter */}
    <div className="py-1 px-1 text-xs font-medium rounded-md uppercase md:tracking-wider hover:bg-yellow-400">
      <div>
        <select
          name="college"
          onChange={handleFilterChange}
          className="text-xs md:text-sm rounded-md py-1 px-1 dark:bg-black"
          value={filter.college}
        >
          {collegeOptions}
        </select>
      </div>
    </div>

    {/* Sport Column with Dropdown Filter */}
    <div className="py-1 px-1 text-xs font-medium rounded-md uppercase md:tracking-wider hover:bg-yellow-400">
      <div>
        <select
          name="sport"
          onChange={handleFilterChange}
          className="text-xs md:text-sm rounded-md py-1 px-1 dark:bg-black"
        >
          <option value="">All Sports</option>
          <option value="Soccer">Soccer</option>
          <option value="Flag Football">Flag Football</option>
          <option value="Spikeball">Spikeball</option>
          <option value="Cornhole">Cornhole</option>
          <option value="Pickleball">Pickleball</option>
          <option value="Table Tennis">Table Tennis</option>
          <option value="Broomball">Broomball</option>
          <option value="Basketball">Basketball</option>
          <option value="Indoor Soccer">Indoor Soccer</option>
          <option value="Dodgeball">Dodgeball</option>
          <option value="Volleyball">Volleyball</option>
          <option value="Netball">Netball</option>
        </select>
      </div>
    </div>

    {/* Sort By Asc/Desc Filter */}
    <div className="pl-2 text-xs font-medium rounded-md">
      <fieldset>
        <div className="flex items-center space-x-4 mt-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="sortOrder"
              value="desc"
              checked={sortOrder === "desc"}
              onChange={(e) => handleSortOrderChange(e.target.value)}
              className="form-radio h-4 w-4 text-yellow-400 border-gray-300 dark:bg-black"
            />
            <span className="ml-2 text-xs md:text-sm">desc</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="sortOrder"
              value="asc"
              checked={sortOrder === "asc"}
              onChange={(e) => handleSortOrderChange(e.target.value)}
              className="form-radio h-4 w-4 text-yellow-400 border-gray-300 dark:bg-black"
            />
            <span className="ml-2 text-xs md:text-sm">asc</span>
          </label>
        </div>
      </fieldset>
    </div>
  </div>
);

export default TableHeader;
