import { FaCalendar } from "react-icons/fa";
import { toCollegeName, emojiMap } from "@src/utils/helpers";
import { Match } from "@src/types/components";

interface MatchListItemProps {
  match: Match;
  user: any;
  signedUpMatches: Match[];
  loading: boolean;
  handleSignUp: (match: Match) => void;
  handleUnregister: (match: Match) => void;
  handleAddToGCal: (match: Match) => void;
}

const MatchListItem: React.FC<MatchListItemProps> = ({
  match,
  user,
  signedUpMatches,
  loading,
  handleSignUp,
  handleUnregister,
  handleAddToGCal,
}) => {
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

  const isFutureMatch =
    match.timestamp && new Date(match.timestamp) > new Date();

  const isUserTeam =
    user &&
    (match.home_college === user.college ||
      match.away_college === user.college);

  const isSignedUp = signedUpMatches.some((signedUpMatch) => {
    const matchDate = new Date(match.timestamp).toISOString();
    const signedUpMatchDate = new Date(signedUpMatch.timestamp).toISOString();
    return (
      `${match.home_college}-${match.away_college}-${matchDate}` ===
      `${signedUpMatch.home_college}-${signedUpMatch.away_college}-${signedUpMatchDate}`
    );
  });

  return (
    <li className="bg-white dark:bg-black shadow-lg p-6 rounded-lg hover:shadow-xl transition duration-300 ease-in-out max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-2xl font-bold mb-1">
            {toCollegeName[match.home_college || "TBD"]} vs{" "}
            {toCollegeName[match.away_college || "TBD"]}
          </div>
          <div className="text-gray-600 font-semibold">
            {match.sport} {emojiMap[match.sport]}
          </div>
          <div className="text-gray-500">
            {matchDate} at {matchTime}
          </div>
          {match.home_college_score !== null &&
            match.away_college_score !== null && (
              <div className="text-gray-500">
                Score: {match.home_college_score} - {match.away_college_score}
              </div>
            )}
          {match.winner && (
            <div className="text-gray-500">Winner: {match.winner}</div>
          )}
        </div>
        <div className="flex">
          {isFutureMatch && isUserTeam && (
            <button
              onClick={() =>
                !loading &&
                (isSignedUp ? handleUnregister(match) : handleSignUp(match))
              }
              onMouseEnter={(e) => {
                if (isSignedUp) {
                  e.currentTarget.classList.add("bg-red-600");
                  e.currentTarget.classList.remove("bg-green-600");
                }
              }}
              onMouseLeave={(e) => {
                if (isSignedUp) {
                  e.currentTarget.classList.add("bg-green-600");
                  e.currentTarget.classList.remove("bg-red-600");
                }
              }}
              className={`ml-5 w-36 h-10 text-white rounded-lg shadow transition duration-200 ease-in-out ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : isSignedUp
                  ? "bg-green-600 hover:bg-red-600"
                  : "bg-blue-600 hover:scale-110"
              }`}
              disabled={loading}
            >
              {loading ? "Loading..." : isSignedUp ? "Playing!" : "Sign Up"}
            </button>
          )}
          <button
            onClick={() => handleAddToGCal(match)}
            className="ml-4 rounded-full p-2 text-gray-500 hover:text-gray-800 transition duration-200 ease-in-out"
          >
            <FaCalendar />
          </button>
        </div>
      </div>
    </li>
  );
};

export default MatchListItem;
