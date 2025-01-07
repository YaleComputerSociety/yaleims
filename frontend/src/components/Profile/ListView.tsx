import React, { useEffect, useState } from "react";
import { toCollegeName, emojiMap } from "@src/utils/helpers";
import { FaCalendar } from "react-icons/fa";
import { useUser } from "@src/context/UserContext";
import { Match } from "@src/types/components";
import { useAddToGCal } from "@src/hooks/useAddToGCal";

// Define the props type for the ListView component
interface ListViewProps {
  matches: Match[];
  signUp: (match: Match) => void;
  unregister: (match: Match) => void; // New unregister function
}

const ListView: React.FC<ListViewProps> = ({ matches, signUp, unregister }) => {
  const { user } = useUser();
  const { addToGCal } = useAddToGCal();
  const [signedUpMatches, setSignedUpMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredMatch, setHoveredMatch] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSignedUpMatches();
    }
  }, [user]);

  const fetchSignedUpMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://us-central1-yims-125a2.cloudfunctions.net/getUserMatches?userId=${user.email}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch signed-up matches");
      }

      const data = await response.json();
      setSignedUpMatches(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching signed-up matches:", error);
      setLoading(false);
    }
  };

  const handleSignUp = async (match: Match) => {
    try {
      setLoading(true);
      await signUp(match);
      fetchSignedUpMatches();
      setLoading(false);
    } catch (error) {
      console.error("Error signing up for match:", error);
      setLoading(false);
    }
  };

  const handleUnregister = async (match: Match) => {
    try {
      setLoading(true);
      await unregister(match);
      fetchSignedUpMatches();
      setLoading(false);
    } catch (error) {
      console.error("Error unregistering for match:", error);
      setLoading(false);
    }
  };

  const handleAddToGCal = (match: Match) => {
    addToGCal(match);
  };

  if (!user) {
    return (
      <div className="text-center text-gray-500">
        Please sign in to view your matches.
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden shadow-lg bg-white dark:bg-black">
      {matches.length === 0 ? (
        <div className="text-center text-gray-500 p-6">No future matches found.</div>
      ) : (
        <ul>
          {matches.map((match: Match, index: number) => {
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

            const isSignedUp = signedUpMatches.some((signedUpMatch) => {
              const matchDate = new Date(match.timestamp);
              const signedUpMatchDate = new Date(signedUpMatch.timestamp);
              const matchId = `${match.home_college}-${match.away_college}-${matchDate.toISOString()}`;
              const signedUpMatchId = `${signedUpMatch.home_college}-${signedUpMatch.away_college}-${signedUpMatchDate.toISOString()}`;
              return signedUpMatchId === matchId;
            });

            const matchId = `${match.home_college}-${match.away_college}-${match.timestamp}`;

            return (
              <li
                key={index}
                className={`border-b last:border-b-0 p-4 transition duration-300 ease-in-out ${
                  isSignedUp && hoveredMatch === matchId
                    ? "bg-red-500 text-white cursor-pointer"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onMouseEnter={() => isSignedUp && setHoveredMatch(matchId)}
                onMouseLeave={() => setHoveredMatch(null)}
                onClick={() => {
                  if (isSignedUp) {
                    handleUnregister(match);
                  } else {
                    handleSignUp(match);
                  }
                }}
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
                  <div className="flex items-center space-x-2">
                    {isSignedUp && hoveredMatch !== matchId ? (
                      <button className="w-24 h-10 bg-green-600 text-white rounded-lg shadow">
                        Playing!
                      </button>
                    ) : !isSignedUp ? (
                      <button
                        className="w-24 h-10 bg-blue-600 text-white rounded-lg shadow hover:scale-110 focus:outline-none transition duration-200 ease-in-out"
                        disabled={loading}
                      >
                        {loading ? "Loading..." : "Sign Up"}
                      </button>
                    ) : (
                      <button
                        className="w-24 h-10 bg-red-600 text-white rounded-lg shadow hover:scale-110 focus:outline-none transition duration-200 ease-in-out"
                      >
                        {loading ? "Loading..." : "Unregister"}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToGCal(match);
                      }}
                      className="px-4 h-10 bg-blue-600 text-white rounded-lg shadow hover:scale-110 focus:outline-none transition duration-300 ease-in-out"
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
