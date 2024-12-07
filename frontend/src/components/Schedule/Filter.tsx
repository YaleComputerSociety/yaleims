import { colleges } from '../../data/colleges';
import { sports } from '../../data/sports';

interface FiltersProps {
  filter: { college: string; sport: string; date: Date | null };
  updateFilter: (key: keyof FiltersProps['filter'], value: string) => void;
}

const Filters: React.FC<FiltersProps> = ({ filter, updateFilter }) => (
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
