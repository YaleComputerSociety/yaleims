import { useEffect, useState } from "react";
import { FaCalendar } from "react-icons/fa";
import {
  toCollegeName,
  emojiMap,
  generateGoogleCalendarLink,
} from "@src/utils/helpers";
import { Match } from "@src/types/components";

interface MatchListItemProps {
  match: Match;
  user: any;
  isSignedUp: boolean; // Pass initial state from parent
}

import { Participant } from "@src/types/components";

const MatchListItem: React.FC<MatchListItemProps> = ({
  match,
  user,
  isSignedUp,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedUpState, setIsSignedUp] = useState(isSignedUp);
  const [isHovered, setIsHovered] = useState(false);
  const [participantsShow, setParticipantsShow] = useState(false);
  const [participantionData, setParticipantionData] = useState({
    home_college_participants: match.home_college_participants,
    away_college_participants: match.away_college_participants,
  });

  // Check if match is in the past
  const isPastMatch = match.timestamp
    ? new Date(match.timestamp) < new Date()
    : false;

  const handleSignUp = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(
        "https://addparticipant-65477nrg6a-uc.a.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId: match.id,
            participantType:
              toCollegeName[user.college] == toCollegeName[match.home_college]
                ? "home_college_participants"
                : "away_college_participants",
            user, // Pass the full user object
            selectedMatch: match, // Pass the full match object
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sign up for the match");
      }

      setIsSignedUp(true);
      if (participantsShow) {
        const participant_data = await getMatchParticipants(
          match.id.toString()
        );
        setParticipantionData(participant_data);
      }
    } catch (error) {
      console.error("Error signing up:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchParticipants = async (matchId: string) => {
    try {
      const response = await fetch(
        `https://getmatchparticipants-65477nrg6a-uc.a.run.app?matchId=${matchId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Check if the response is OK (status code 200-299)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the response as JSON
      const data = await response.json();
      // Return the data if needed
      return data;
    } catch (error) {
      console.error("Error fetching match participants:", error);
    }
  };

  const handleUnregister = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "https://removeparticipant-65477nrg6a-uc.a.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId: match.id,
            participantType:
              toCollegeName[user.college] === toCollegeName[match.home_college]
                ? "home_college_participants"
                : "away_college_participants",
            user, // Pass the full user object
            selectedMatch: match, // Pass the full match object
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to unregister from the match"
        );
      }

      setIsSignedUp(false);
      if (participantsShow) {
        const participant_data = await getMatchParticipants(
          match.id.toString()
        );
        setParticipantionData(participant_data);
      }
    } catch (error) {
      console.error("Error unregistering:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToGCal = () => {
    const link = generateGoogleCalendarLink(match);
    window.open(link, "_blank");
  };

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

  const location = match.location || "Location TBD";

  const isUserTeam =
    user &&
    (toCollegeName[match.home_college] === user.college ||
      toCollegeName[match.away_college] === user.college);

  return (
    <li className="bg-white dark:bg-black shadow-lg p-4 rounded-lg hover:shadow-xl transition duration-300 ease-in-out max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          {/* Match Teams */}
          <div className="text-sm sm:text-lg font-bold">
            {toCollegeName[match.home_college || "TBD"]}{" "}
            {match.away_college != "Bye" ? (
              <>
                vs {toCollegeName[match.away_college]} {emojiMap[match.sport]}
              </>
            ) : (
              <>(BYE)</>
            )}
          </div>

          {/* Match Sport */}
          <div className="text-sm sm:text-md text-gray-600 dark:text-gray-400 font-semibold">
            {match.sport}{" "}
            {match.type == "Regular"
              ? "Regular Season Match"
              : `${match.type} Round`}
          </div>

          {/* Match Date and Time */}
          <div className="text-xs sm:text-sm text-gray-500">
            {matchDate} at {matchTime}
          </div>

          {/* Match Location */}
          <div className="text-gray-500 text-xs sm:text-sm">
            {location} {match.location_extra ? match.location_extra : null}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-0">
          {isPastMatch ? (
            // Show score for past matches
            <div className="text-sm sm:text-2xl font-bold ml-5">
              {match.home_college_score !== undefined &&
              match.away_college_score !== undefined ? (
                <span>
                  {match.home_college_score} - {match.away_college_score}
                </span>
              ) : (
                <span className="text-gray-500 text-sm sm:text-md">
                  Score Pending
                </span>
              )}
            </div>
          ) : (
            // Show signup and calendar buttons for future matches
            <>
              <button
                onClick={() =>
                  isSignedUpState ? handleUnregister() : handleSignUp()
                }
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`ml-5 w-20 sm:w-36 text-xs sm:text-sm h-10 text-white rounded-lg shadow transition duration-200 ease-in-out ${
                  isLoading || !isUserTeam
                    ? "bg-gray-400 cursor-not-allowed"
                    : isSignedUpState
                    ? "bg-green-600 hover:bg-red-600"
                    : "bg-blue-600 hover:scale-110"
                }`}
                disabled={isLoading || !isUserTeam}
              >
                {isLoading
                  ? "Loading..."
                  : !isUserTeam
                  ? "Not Your College"
                  : isSignedUpState
                  ? isHovered
                    ? "Unregister"
                    : "Playing!"
                  : "Sign Up"}
              </button>

              <button
                onClick={handleAddToGCal}
                className="ml-4 rounded-full p-2 text-gray-500 hover:text-gray-800 transition duration-200 ease-in-out"
              >
                <FaCalendar />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="text-right text-xs text-gray-500 dark:text-gray-600">
        <button
          className="underline"
          onClick={async () => {
            if (!participantsShow) {
              const participant_data = await getMatchParticipants(
                match.id.toString()
              );
              setParticipantionData(participant_data);
            }
            setParticipantsShow(!participantsShow);
          }}
        >
          Participants
        </button>
        <div
          className={`transition-all duration-300 ${
            participantsShow ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden`}
        >
          <div>
            <span className="text-black dark:text-gray-400 font-semibold text-animate h-20">
              {toCollegeName[match.home_college]}:
            </span>{" "}
            {participantionData?.home_college_participants?.length > 0 ? (
              participantionData.home_college_participants.map(
                (p: Participant, index: number) => (
                  <span key={index}>
                    {p.firstname && p.firstname.trim() !== ""
                      ? `${p.firstname} ${p.lastname}`.trim()
                      : p.name || ""}
                    {index <
                    participantionData.home_college_participants.length - 1
                      ? ", "
                      : ""}
                  </span>
                )
              )
            ) : (
              <span className="text-gray-500">None</span>
            )}
          </div>
          <div>
            <span className="text-black dark:text-gray-400 font-semibold">
              {toCollegeName[match.away_college]}:
            </span>{" "}
            {participantionData?.away_college_participants?.length > 0 ? (
              participantionData.away_college_participants.map(
                (p: Participant, index: number) => (
                  <span key={index}>
                    {p.firstname && p.firstname.trim() !== ""
                      ? `${p.firstname} ${p.lastname}`.trim()
                      : p.name || ""}
                    {index <
                    participantionData.away_college_participants.length - 1
                      ? ", "
                      : ""}
                  </span>
                )
              )
            ) : (
              <span className="text-gray-500">None</span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

export default MatchListItem;
