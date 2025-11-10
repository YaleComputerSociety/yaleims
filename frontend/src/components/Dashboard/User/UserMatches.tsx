import React, { useEffect, useState } from "react";
import { Match } from "@src/types/components";
import { FaCalendar } from "react-icons/fa";
import {
  currentYear,
  emojiMap,
  generateGoogleCalendarLink,
  groupByDate,
  toCollegeName,
} from "@src/utils/helpers";
import { useUser } from "@src/context/UserContext";
import { useSeason } from "@src/context/SeasonContext";
import LoadingSpinner from "@src/components/LoadingSpinner";

interface MatchListItemProps {
  match: Match;
  roundedClass?: string;
}

/**
 * MatchListItem
 *
 * Props:
 * - match: Match object to display
 * - roundedClass (optional): gives the appropriate rounded corners class based on position in list; otherwise has no rounding
 */
const MatchListItem: React.FC<MatchListItemProps> = ({
  match,
  roundedClass = "",
}) => {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedUpState, setIsSignedUp] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch(
        "https://addparticipant-65477nrg6a-uc.a.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            matchId: match.id,
            participantType:
              user?.college === match.home_college
                ? "home_college_participants"
                : "away_college_participants",
            user,
            selectedMatch: match,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sign up for the match");
      }

      setIsSignedUp(true);
    } catch (error) {
      console.error("Error signing up:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnregister = async () => {
    setIsLoading(true);
    try {
      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch(
        "https://removeparticipant-65477nrg6a-uc.a.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            matchId: match.id,
            participantType:
              user?.college === match.home_college
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
    ? new Date(match.timestamp)
        .toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
        .replace(/^0/, "") // Remove leading zero if present
    : "Time TBD";

  const location = match.location || "Location TBD";

  const isUserTeam =
    user &&
    (toCollegeName[match.home_college] === user.college ||
      toCollegeName[match.away_college] === user.college);

  return (
    <li
      className={`bg-white dark:bg-black shadow-lg p-4 ${roundedClass} hover:shadow-xl transition duration-300 ease-in-out`}
    >
      <div className="flex items-center">
        {/* Sport Emoji */}
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-3xl mr-1 hidden xs:block">
          {emojiMap[match.sport]}
        </div>

        {/* Match Details */}
        <div className="flex-grow flex flex-col space-y-1">
          <div className="flex text-xs sm:text-lg font-bold">
            {toCollegeName[match.home_college || "TBD"]} vs{" "}
            {toCollegeName[match.away_college || "TBD"]}
          </div>

          <div className="flex flex-row">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-semibold">
              {match.sport}{" "}
              {match.type == "Regular"
                ? "Regular Season Match"
                : `${match.type} Round`}
            </div>
          </div>

          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {matchDate} at {matchTime}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {location}
            {match.location_extra ? ", " + match.location_extra : ""}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-end space-y-2 gap-3 items-center">
          <button
            onClick={() =>
              isSignedUpState ? handleUnregister() : handleSignUp()
            }
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`w-24 xs:w-36 h-8 sm:h-10 text-xs sm:text-sm text-white rounded-lg shadow transition duration-200 ease-in-out ${
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
              : isSignedUpState
              ? isHovered
                ? "Unregister"
                : "Playing!"
              : "Sign Up"}
          </button>
          <button
            onClick={handleAddToGCal}
            className="w-8 h-8 sm-q-10 sm-h-10 flex items-center justify-center p-2 rounded-full hover:text-gray-500 transition duration-200 ease-in-out"
          >
            <FaCalendar />
          </button>
        </div>
      </div>
    </li>
  );
};

const MatchList: React.FC<{ matches: Match[] }> = ({ matches }) => {
  const matchesByDate = groupByDate(matches);

  const getRoundedClass = (matchesLength: number, matchIndex: number) => {
    if (matchesLength === 1) return "rounded-lg";

    if (matchIndex == matchesLength - 1) {
      return "rounded-b-lg";
    }

    if (matchIndex === 0) {
      return "rounded-t-lg";
    }

    return "";
  };

  if (matches.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-200 p-6">
        No matches found.
      </div>
    );
  }

  return (
    <div>
      {Object.entries(matchesByDate).map(([date, matches]) => (
        <div key={date} className="min-w-full rounded-lg mb-4">
          <div>
            <div className="text-left p-2 bg-black-100 border-none">
              {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
          <div>
            <ul>
              {matches.map((match, index) => (
                <MatchListItem
                  key={index}
                  match={match}
                  roundedClass={getRoundedClass(matches.length, index)}
                />
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

const UserMatches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { currentSeason } = useSeason();

  useEffect(() => {
    // Fetch user matches
    const fetchUserMatches = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/functions/getUserMatches?seasonId=${
            currentSeason?.year || currentYear
          }`
        );
        if (!response.ok)
          throw new Error(`Error fetching matches: ${response.statusText}`);
        const data = await response.json();

        setMatches(data);
      } catch (error) {
        console.error("Failed to fetch user matches:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserMatches();
  }, [currentSeason, currentYear]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center pt-10">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4">
      <MatchList matches={matches} />
    </div>
  );
};

export default UserMatches;
