import { colleges } from "../../utils/helpers";
import { sports } from "../../utils/helpers";

import { CalendarFiltersProps } from "@src/types/components";

const Filters: React.FC<CalendarFiltersProps> = ({ filter, updateFilter }) => (
  <div className="flex justify-center space-x-4 mb-8 ">
    <div className="py-1 px-1 text-xs font-medium rounded-md uppercase md:tracking-wider hover:bg-yellow-400">
      <select
        value={filter.college}
        onChange={(e) => updateFilter("college", e.target.value)}
        className="text-sm md:text-md rounded-md py-1 px-1 dark:bg-black"
      >
        <option value="">All Colleges</option>
        {Object.values(colleges).map((college) => (
          <option key={college.id} value={college.name}>
            {college.name}
          </option>
        ))}
      </select>
    </div>
    <div className="py-1 px-1 text-xs font-medium rounded-md uppercase md:tracking-wider hover:bg-yellow-400">
      <select
        value={filter.sport}
        onChange={(e) => updateFilter("sport", e.target.value)}
        className="text-sm md:text-md rounded-md py-1 px-1 dark:bg-black"
      >
        <option value="">All Sports</option>
        {Object.values(sports).map((sport) => (
          <option key={sport.id} value={sport.name}>
            {sport.name}
          </option>
        ))}
      </select>
    </div>
  </div>
);

export default Filters;
