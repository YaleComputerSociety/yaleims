import { useEffect, useState } from "react";
import {
  toCollegeName,
  emojiMap,
  toCollegeAbbreviation,
} from "@src/utils/helpers";
import { CalendarMatchListProps } from "@src/types/components";
import { FaCalendar, FaSpinner } from "react-icons/fa";
import { useAddToGCal } from "@src/hooks/useAddToGCal";
import { useUser } from "@src/context/UserContext";
import { Match } from "@src/types/components";
import { is } from "date-fns/locale";

const ListView: React.FC<CalendarMatchListProps> = ({ matches, signUp }) => {
  const { user, signIn } = useUser(); // Use already fetched user data
  const { addToGCal, addingToCalendar } = useAddToGCal();
  const [signedUpMatches, setSignedUpMatches] = useState<Match[]>([]);
  const [signUpTriggered, setSignUpTriggered] = useState(false); // Tracks sign-up events
  const [loading, setLoading] = useState(true);

  const handleAddToGCal = (match: Match) => {
    addToGCal(match);
  };

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
      setSignedUpMatches(data); // Update state with signed-up matches
      setLoading(false);
    } catch (error) {
      console.error("Error fetching signed-up matches:", error);
    }
  };

  const handleSignUp = async (match: Match) => {
    try {
      setLoading(true);
      await signUp(match); // Call the provided sign-up function
      setSignUpTriggered((prev) => !prev); // Toggle the state to trigger useEffect
      setLoading(false);
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
        <div className="text-center text-gray-500">
          No future matches found.
        </div>
      ) : (
        <div>
          <ul className="space-y-4">
            {!user && (
              <li
                className="bg-green-500 dark:bg-green-600 shadow-md p-4 rounded-md 
                          hover:shadow-lg hover:scale-110 transition-transform 
                          duration-300 ease-in-out text-center"
                onClick={signIn}
              >
                <span className="text-white dark:text-gray-200 font-medium">
                  Sign in with Google to sign up for matches!
                </span>
              </li>
            )}

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

              let isUserTeam = false;

              if (user) {
                isUserTeam =
                  match.home_college === toCollegeAbbreviation[user.college] ||
                  match.away_college === toCollegeAbbreviation[user.college];
              }

              const isSignedUp = signedUpMatches.some((signedUpMatch) => {
                const matchDate = new Date(match.timestamp);
                const signedUpMatchDate = new Date(signedUpMatch.timestamp);
                const matchId = `${match.home_college}-${
                  match.away_college
                }-${matchDate.toISOString()}`;
                const signedUpMatchId = `${signedUpMatch.home_college}-${
                  signedUpMatch.away_college
                }-${signedUpMatchDate.toISOString()}`;
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
                          <button className=" ml-5 w-36 h-10 bg-green-600 text-white rounded-lg">
                            Playing!
                          </button>
                        ) : (
                          <button
                            onClick={() => !loading && handleSignUp(match)} // Prevent clicking while loading
                            className={`ml-5 w-36 h-10 text-white rounded-lg shadow transition duration-200 ease-in-out 
                                ${
                                  loading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:scale-110 focus:outline-none"
                                }`}
                            disabled={loading} // Disable button while loading
                          >
                            {loading ? (
                              <div className="flex items-center justify-center space-x-2">
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
                                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                    fill="currentFill"
                                  />
                                </svg>
                              </div>
                            ) : (
                              "Sign Up"
                            )}
                          </button>
                        )
                      ) : null}
                    </div>
                    <button
                      onClick={() => handleAddToGCal(match)}
                      className="px-6 ml-5 py-3 bg-blue-600 text-white rounded-lg shadow hover:scale-110 focus:outline-none transition duration-300 ease-in-out"
                    >
                      {addingToCalendar.isAddingToCalendar &&
                      addingToCalendar.matchId === match.id ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaCalendar />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ListView;
