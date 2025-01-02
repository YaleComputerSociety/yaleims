import { useEffect, useState } from "react";
import { toCollegeName, emojiMap, toCollegeAbbreviation } from "@src/utils/helpers";
import { CalendarMatchListProps } from "@src/types/components";
import { FaCalendar } from "react-icons/fa";
import { useAddToGCal } from "@src/hooks/useAddToGCal";
import { useUser } from "@src/context/UserContext";
import { Match } from "@src/types/components";

const ListView: React.FC<CalendarMatchListProps> = ({ matches, signUp }) => {
  const { user } = useUser(); // Use already fetched user data
  const { addToGCal } = useAddToGCal();
  const [signedUpMatches, setSignedUpMatches] = useState<Match[]>([]);
  const [signUpTriggered, setSignUpTriggered] = useState(false); // Tracks sign-up events


  const handleAddToGCal = (match: Match) => {
    addToGCal(match);
  };

  console.log(user)

  const fetchSignedUpMatches = async () => {
    try {
  
      const response = await fetch(`https://us-central1-yims-125a2.cloudfunctions.net/getUserMatches?userId=${user.email}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch signed-up matches");
      }

      const data = await response.json();
      setSignedUpMatches(data); // Update state with signed-up matches
    } catch (error) {
      console.error("Error fetching signed-up matches:", error);
    }
  };

  const handleSignUp = async (match: Match) => {
    try {
      await signUp(match); // Call the provided sign-up function
      setSignUpTriggered((prev) => !prev); // Toggle the state to trigger useEffect
    } catch (error) {
      console.error("Error signing up for match:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSignedUpMatches();
    }
  }, [user, signUpTriggered]);

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

            const isUserTeam =
              match.home_college === toCollegeAbbreviation[user.college] ||
              match.away_college === toCollegeAbbreviation[user.college];

            const isSignedUp = signedUpMatches.some((signedUpMatch) => {
              const matchDate = new Date(match.timestamp);
              const signedUpMatchDate = new Date(signedUpMatch.timestamp)
              const matchId = `${match.home_college}-${match.away_college}-${matchDate.toISOString()}`;
              const signedUpMatchId = `${signedUpMatch.home_college}-${signedUpMatch.away_college}-${signedUpMatchDate.toISOString()}`;
              return signedUpMatchId === matchId;
            });
              
            return (
              <li
                key={index}
                className="bg-white dark:bg-black shadow-lg p-6 rounded-lg hover:shadow-xl transition duration-300 ease-in-out"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-bold mb-1">
                      {toCollegeName[match.home_college || "TBD"]}{" "}
                      <span>vs</span>{" "}
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
                  <div className="flex">
                    {isUserTeam ? (
                      isSignedUp ? (
                        <button
                          className="px-6 ml-5 py-3 bg-green-600 text-white rounded-lg shadow"
                        >
                          Playing!
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSignUp(match)}
                          className="px-6 ml-5 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-800 focus:outline-none transition duration-200 ease-in-out"
                        >
                          Sign Up
                        </button>
                      )
                    ) : null}

                    <button
                      onClick={() => handleAddToGCal(match)}
                      className="px-6 ml-5 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none transition duration-300 ease-in-out"
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
