import { toCollegeName } from "@src/utils/helpers";
import { CalendarMatchListProps } from "@src/types/components";

const ListView: React.FC<CalendarMatchListProps> = ({ matches, onMatchClick }) => {
  return (
    <div>
      {matches.length === 0 ? (
        <div className="text-center text-gray-500">No future matches found.</div>
      ) : (
        <ul className="space-y-4">
          {matches.map((match, index) => {
            const matchDate = match.timestamp
              ? new Date(match.timestamp).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Date TBD";

            const matchTime = match.timestamp
              ? new Date(match.timestamp).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Time TBD";

            return (
              <li
                key={index}
                className="bg-white shadow-lg p-6 rounded-lg hover:shadow-xl transition duration-300 ease-in-out"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-bold mb-1 text-gray-900">
                      {toCollegeName[match.home_college || "TBD"]}{" "}
                      <span>vs</span>{" "}
                      {toCollegeName[match.away_college || "TBD"]}
                    </div>
                    <div className="text-gray-600 font-semibold">
                      {match.sport}
                    </div>
                    <div className="text-gray-500">
                      {matchDate} at {matchTime}
                    </div>
                    {match.home_college_score !== null &&
                      match.away_college_score !== null && (
                        <div className="text-gray-500">
                          Score: {match.home_college_score} -{" "}
                          {match.away_college_score}
                        </div>
                      )}
                    {match.winner && (
                      <div className="text-gray-500">
                        Winner: {match.winner}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onMatchClick(match)}
                    className="px-6 ml-5 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none transition duration-300 ease-in-out"
                  >
                    Sign Up
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ListView;
