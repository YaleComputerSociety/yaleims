import { Match } from "../../data/matches";

interface MatchListProps {
  matches: Match[];
  onMatchClick: (match: Match) => void;
}

const ListView: React.FC<MatchListProps>  = ({ matches, onMatchClick }) => (
    <ul className="space-y-4">
      {matches.map((match, index) => (
        <li key={index} className="bg-white shadow-lg p-6 rounded-lg hover:shadow-xl transition duration-300 ease-in-out">
          <div className="flex justify-between items-center">
            <div>
                <div className="text-2xl font-bold mb-1 text-gray-900">
                {match.college1} <span className="text-green-500">vs</span> {match.college2}
                </div>
                <div className="text-gray-600 font-semibold">{match.sport}</div>
                <div className="text-gray-500">{match.date} at {match.time}</div>
                <div className="text-gray-500">Location: {match.location}</div>
            </div>
          <button onClick={() => onMatchClick(match)} className="px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 focus:outline-none transition duration-300 ease-in-out">
            Sign Up
          </button>
          </div>
        </li>
      ))}
    </ul>
  );
  
  export default ListView;
  