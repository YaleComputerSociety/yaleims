import { colleges } from '../../data/colleges';
import { sports } from '../../data/sports';


interface FiltersProps {
    collegeFilter: string;
    setCollegeFilter: React.Dispatch<React.SetStateAction<string>>;
    sportFilter: string;
    setSportFilter: React.Dispatch<React.SetStateAction<string>>;
  }

const Filters: React.FC<FiltersProps> = ({ collegeFilter, setCollegeFilter, sportFilter, setSportFilter }) => (
  <div className="flex justify-center space-x-4 mb-8">
    <select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} className="p-2 border w-48">
      <option value="">All Colleges</option>
      {Object.values(colleges).map((college) => (
        <option key={college.id} value={college.name}>{college.name}</option>
      ))}
    </select>
    <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} className="p-2 border w-48">
      <option value="">All Sports</option>
      {Object.values(sports).map((sport) => (
        <option key={sport.id} value={sport.name}>{sport.name}</option>
      ))}
    </select>
  </div>
);

export default Filters;
