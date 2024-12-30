import { colleges } from '../../utils/helpers';
import { sports } from '../../utils/helpers';

import { CalendarFiltersProps } from '@src/types/components';

const Filters: React.FC<CalendarFiltersProps> = ({ filter, updateFilter }) => (
  <div className="flex justify-center space-x-4 mb-8">
    <select
      value={filter.college}
      onChange={(e) => updateFilter('college', e.target.value)}
      className="p-2 border w-48"
    >
      <option value="">All Colleges</option>
      {Object.values(colleges).map((college) => (
        <option key={college.id} value={college.name}>
          {college.name}
        </option>
      ))}
    </select>
    <select
      value={filter.sport}
      onChange={(e) => updateFilter('sport', e.target.value)}
      className="p-2 border w-48"
    >
      <option value="">All Sports</option>
      {Object.values(sports).map((sport) => (
        <option key={sport.id} value={sport.name}>
          {sport.name}
        </option>
      ))}
    </select>
  </div>
);

export default Filters;
