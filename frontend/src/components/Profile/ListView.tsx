import React, { useEffect, useState } from "react";
import { toCollegeName, emojiMap } from "@src/utils/helpers";
import { FaCalendar } from "react-icons/fa";
import { useUser } from "@src/context/UserContext";
import { Match } from "@src/types/components";
import { useAddToGCal } from "@src/hooks/useAddToGCal";

interface ListViewProps {
  matches: Match[];
  signUp: (selectedMatch: Match) => Promise<void>;
  unregister: (selectedMatch: Match) => Promise<void>;
}

const ListView: React.FC<ListViewProps> = ({
  matches: initialMatches,
  signUp,
  unregister,
}) => {
  const { user } = useUser();
  const { addToGCal } = useAddToGCal();
  const [matches, setMatches] = useState<Match[]>([]); // Manage matches locally
  const [signedUpMatches, setSignedUpMatches] = useState<Match[]>([]);
  const [loadingMatch, setLoadingMatch] = useState<string | null>(null);
  const [hoveredMatch, setHoveredMatch] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      initializeMatches();
    }
  }, [user, initialMatches]);

  const initializeMatches = () => {
    // Sort initial matches by date
    const sortedMatches = initialMatches.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    setMatches(sortedMatches);

    // Assume signed-up matches are a subset of initialMatches
    const signedUp = sortedMatches.filter((match) =>
      match.signedUpUsers?.includes(user.email)
    );
    setSignedUpMatches(signedUp);
  };

  const handleSignUp = async (match: Match) => {
    const matchId = `${match.home_college}-${match.away_college}-${match.timestamp}`;
    try {
      setLoadingMatch(matchId);
      await signUp(match);

      // Update matches and signed-up matches locally
      setSignedUpMatches((prev) => [...prev, match]);
      setMatches((prev) =>
        prev.map((m) =>
          m.timestamp === match.timestamp ? { ...m, signedUp: true } : m
        )
      );
    } catch (error) {
      console.error("Error signing up for match:", error);
    } finally {
      setLoadingMatch(null);
    }
  };

  const handleUnregister = async (match: Match) => {
    const matchId = `${match.home_college}-${match.away_college}-${match.timestamp}`;
    try {
      setLoadingMatch(matchId);
      await unregister(match);

      // Update matches and signed-up matches locally
      setSignedUpMatches((prev) =>
        prev.filter((m) => m.timestamp !== match.timestamp)
      );
      setMatches((prev) =>
        prev.map((m) =>
          m.timestamp === match.timestamp ? { ...m, signedUp: false } : m
        )
      );
    } catch (error) {
      console.error("Error unregistering for match:", error);
    } finally {
      setLoadingMatch(null);
    }
  };

  const handleAddToGCal = (match: Match) => {
    addToGCal(match);
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-lg bg-white dark:bg-black">
      {matches.length === 0 ? (
        <div className="text-center text-gray-500 p-6">
          No future matches found.
        </div>
      ) : (
        <ul>
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

            const isSignedUp = signedUpMatches.some(
              (m) => m.timestamp === match.timestamp
            );

            const matchId = `${match.home_college}-${match.away_college}-${match.timestamp}`;

            return (
              <li
                key={index}
                className="border-b last:border-b-0 p-4 transition duration-300 ease-in-out"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="text-xl">{emojiMap[match.sport]}</div>
                    <div className="flex flex-col">
                      <div className="text-base font-bold">
                        {toCollegeName[match.home_college || "TBD"]} vs{" "}
                        {toCollegeName[match.away_college || "TBD"]}
                      </div>
                      <div className="text-xs text-gray-600 font-semibold">
                        {match.sport} | {matchTime} | {matchDate}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    {isSignedUp ? (
                      <button
                        className={`w-32 h-10 rounded-lg shadow transition duration-200 ease-in-out ${
                          hoveredMatch === matchId
                            ? "bg-red-600 text-white hover:scale-110"
                            : "bg-green-600 text-white"
                        }`}
                        onMouseEnter={() => setHoveredMatch(matchId)}
                        onMouseLeave={() => setHoveredMatch(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnregister(match);
                        }}
                        disabled={loadingMatch === matchId}
                      >
                        {loadingMatch === matchId ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full border-t-2 border-white"></div>
                            <span>Loading</span>
                          </div>
                        ) : hoveredMatch === matchId ? (
                          "Unregister"
                        ) : (
                          "Playing!"
                        )}
                      </button>
                    ) : (
                      <button
                        className="w-32 h-10 bg-blue-600 text-white rounded-lg shadow hover:scale-110 focus:outline-none transition duration-200 ease-in-out"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSignUp(match);
                        }}
                        disabled={loadingMatch === matchId}
                      >
                        {loadingMatch === matchId ? (
                          <div className="flex items-center space-x-2 ml-5">
                            <span>Loading</span>
                            <svg
                              aria-hidden="true"
                              className="w-5 h-5 text-gray-200 animate-spin dark:text-gray-600 fill-white"
                              viewBox="0 0 100 101"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                fill="currentColor"
                              />
                              <path
                                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.0062 17.6338 78.9986 21.2671 81.4318 25.6472C83.0788 28.7335 84.5282 32.0318 85.7368 35.4545C86.6851 38.1283 89.2422 39.5782 91.9162 39.1586L93.9676 39.0409Z"
                                fill="currentFill"
                              />
                            </svg>
                          </div>
                        ) : (
                          "Sign Up"
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToGCal(match);
                      }}
                      className="px-4 h-10 rounded-lg hover:text-gray-500 focus:outline-none transition duration-300 ease-in-out"
                    >
                      <FaCalendar />
                    </button>
                  </div>
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
