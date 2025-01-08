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

const MatchListItem: React.FC<MatchListItemProps> = ({
  match,
  user,
  isSignedUp,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedUpState, setIsSignedUp] = useState(isSignedUp);
  const [isHovered, setIsHovered] = useState(false);

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
            matchId: `${match.home_college}-${match.away_college}-${new Date(
              match.timestamp
            ).toISOString()}`,
            participantType:
              user.college === match.home_college
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
      console.log("Successfully signed up for match:", match);
    } catch (error) {
      console.error("Error signing up:", error);
    } finally {
      setIsLoading(false);
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
            matchId: `${match.home_college}-${match.away_college}-${match.timestamp}`,
            participantType:
              user.college === match.home_college
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
      console.log("Successfully unregistered from match:", match);
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

  console.log(isSignedUpState);

  return (
    <li className="bg-white dark:bg-black shadow-lg p-4 rounded-lg hover:shadow-xl transition duration-300 ease-in-out max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          {/* Match Teams */}
          <div className="text-2xl font-bold mb-1">
            {toCollegeName[match.home_college || "TBD"]} vs{" "}
            {toCollegeName[match.away_college || "TBD"]}
          </div>

          {/* Match Sport */}
          <div className="text-gray-600 font-semibold">
            {match.sport} {emojiMap[match.sport]}
          </div>

          {/* Match Date and Time */}
          <div className="text-gray-500">
            {matchDate} at {matchTime}
          </div>

          {/* Match Location */}
          <div className="text-gray-500">{location}</div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-0">
          {/* Sign Up/Unregister Button */}
          <button
            onClick={() =>
              isSignedUpState ? handleUnregister() : handleSignUp()
            }
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`ml-5 w-36 h-10 text-white rounded-lg shadow transition duration-200 ease-in-out ${
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

          {/* Add to Calendar Button */}
          <button
            onClick={handleAddToGCal}
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
