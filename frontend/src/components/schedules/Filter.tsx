import { useSeason } from "@/context/SeasonContext";
import { COLLEGES } from "@/lib/colleges";

interface FiltersProps {
  /** A college and a sport by name ("" = all), and the first day. */
  filter: { college: string; sport: string; date: Date };
  updateFilter: (key: "college" | "sport", value: string) => void;
}

/** The schedule's college and sport pickers (the current season's sports). */
const Filters: React.FC<FiltersProps> = ({ filter, updateFilter }) => {
  const sports = useSeason().currentSeason?.sports ?? [];
  return (
  <div className="flex justify-center space-x-4 mb-8 ">
    <div className="py-1 px-1 text-xs font-medium rounded-md uppercase items-center md:tracking-wider flex flex-row gap-x-2 hover:bg-yellow-400">
      <select
        value={filter.college}
        onChange={(e) => updateFilter("college", e.target.value)}
        className="text-sm md:text-md rounded-md py-1 px-1 bg-white dark:bg-black"
      >
        <option value="">All Colleges</option>
        {COLLEGES.map((college) => (
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
        className="text-sm md:text-md rounded-md py-1 px-1 bg-white dark:bg-black"
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
  );
};

export default Filters;
