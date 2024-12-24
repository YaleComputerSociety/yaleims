import { TableHeaderProps } from "@src/types/components";
import React from 'react';


  // Updated TableHeader Component
  const TableHeader : React.FC<TableHeaderProps> = ({ handleFilterChange }) => (
    <div className="flex px-2 py-2 rounded-md justify-center justify-self-center">
      {/* Date/Time Column with Dropdown Filter */}
      <div className="py-1 px-1 text-xs font-medium rounded-md text-gray-500 uppercase md:tracking-wider hover:bg-yellow-400">
        <div>
          <select
            name="date"
            onChange={handleFilterChange}
            className="text-xs md:text-sm rounded-md py-1 px-1"
          >
            <option value="all">Date/Time</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
          </select>
        </div>
      </div>

      {/* Colleges & Score Column with Dropdown Filter */}
      <div className="py-1 px-1 text-xs font-medium rounded-md text-gray-500 uppercase md:tracking-wider hover:bg-yellow-400">
        <div>
          <select
            name="college"
            onChange={handleFilterChange}
            className="text-xs md:text-sm rounded-md py-1 px-1"
          >
            <option value="">Colleges</option>
            <option value="BF">Benjamin Franklin</option>
            <option value="BK">Berkeley</option>
            <option value="BR">Branford</option>
            <option value="DC">Davenport</option>
            <option value="ES">Ezra Stiles</option>
            <option value="GH">Grace Hopper</option>
            <option value="JE">Jonathan Edwards</option>
            <option value="MC">Morse</option>
            <option value="MY">Pauli Murray</option>
            <option value="PC">Pierson</option>
            <option value="SY">Saybrook</option>
            <option value="SM">Silliman</option>
            <option value="TD">Timothy Dwight</option>
            <option value="TC">Trumbull</option>
          </select>
        </div>
      </div>

      {/* Sport Column with Dropdown Filter */}
      <div className="py-1 px-1 text-xs font-medium rounded-md text-gray-500 uppercase md:tracking-wider hover:bg-yellow-400">
        <div>
          <select
            name="sport"
            onChange={handleFilterChange}
            className="text-xs md:text-sm rounded-md py-1 px-1"
          >
            <option value="">All Sport</option>
            <option value="Flag Football">Flag Football</option>
            <option value="Spikeball">Spikeball</option>
            <option value="Cornhole">Cornhole</option>
            <option value="Pickleball">Pickleball</option>
            <option value="Table Tennis">Table Tennis</option>
          </select>
        </div>
      </div>
    </div>
  );

  export default TableHeader;