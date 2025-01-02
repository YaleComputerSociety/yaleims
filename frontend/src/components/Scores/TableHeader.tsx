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
          className="text-xs md:text-sm rounded-md py-1 px-1 dark:bg-gray-900"
        >
          <option value="all">Date/Time</option>
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
        </select>
      </div>
    </div>

    {/* Colleges & Score Column with Dropdown Filter */}
    <div className="py-1 px-1 text-xs font-medium rounded-md uppercase md:tracking-wider hover:bg-yellow-400">
      <div>
        <select
          name="college"
          onChange={handleFilterChange}
          className="text-xs md:text-sm rounded-md py-1 px-1 dark:bg-gray-900"
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
          className="text-xs md:text-sm rounded-md py-1 px-1 dark:bg-gray-900"
        >
          <option value="">All Sport</option>
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
    <div className="py-1 px-1 text-xs font-medium rounded-md uppercase md:tracking-wider hover:bg-yellow-400">
      <div>
        <select
          name="sort"
          onChange={(e) => handleSortOrderChange(e.target.value)}
          className="text-xs md:text-sm rounded-md py-1 px-1 dark:bg-gray-900"
          value={sortOrder}
        >
          <option value="desc">Sort Desc</option>
          <option value="asc">Sort Asc</option>
        </select>
      </div>
    </div>
  </div>
);

export default TableHeader;
