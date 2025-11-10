import React, { useState } from "react";
import { Match } from "@src/types/components";
import { FaCalendar } from "react-icons/fa";
import {
  emojiMap,
  generateGoogleCalendarLink,
  groupByDate,
  toCollegeName,
} from "@src/utils/helpers";
import { useUser } from "@src/context/UserContext";

interface MatchListItemProps {
  match: Match;
  roundedClass?: string;
}

/**
 * MatchListItem
 *
 * Props:
 * - match: Match object to display
 * - indexInList: the zero-based index of this match inside the parent list.
 *     Use -1 when this item represents the last element in the list.
 *     This field is optional; when not provided the component will treat
 *     the value as -1. Callers should pass the actual index so the
 *     component (or its parent) can apply list-specific behavior/styling.
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
  const matches: Match[] = [
    {
      id: "m1",
      home_college: "MC",
      away_college: "ES",
      home_college_score: 0,
      away_college_score: 0,
      home_college_participants: [],
      away_college_participants: [],
      sport: "Flag Football",
      timestamp: new Date(
        new Date().getTime() + 5 * 24 * 60 * 60 * 1000
      ).toISOString(), // 5 days from now
      location: "Payne-Whitney Field",
      location_extra: "Upper turf",
      type: "Regular",
      division: "blue",
      winner: null,
      forfeit: false,
      home_college_odds: 1.8,
      away_college_odds: 2.0,
      default_odds: 1.9,
      home_volume: 120,
      away_volume: 80,
    },
    {
      id: "m2",
      home_college: "BK",
      away_college: "MC",
      home_college_score: 21,
      away_college_score: 14,
      home_college_participants: [],
      away_college_participants: [],
      sport: "Broomball",
      timestamp: new Date(
        new Date().getTime() - 20 * 24 * 60 * 60 * 1000
      ).toISOString(), // 20 days ago
      location: "Ingalls Rink",
      type: "Regular",
      division: "green",
      winner: "BRO",
      forfeit: false,
      home_college_odds: 1.4,
      away_college_odds: 3.1,
      home_volume: 300,
      away_volume: 50,
    },
    {
      id: "m3",
      home_college: "MC",
      away_college: "BK",
      home_college_score: 10,
      away_college_score: 10,
      home_college_participants: [],
      away_college_participants: [],
      sport: "Soccer",
      timestamp: new Date().toISOString(),
      location: "Davenport",
      type: "Regular",
      division: "blue",
      winner: null,
      forfeit: false,
      draw_odds: 2.5,
      default_odds: 2.0,
    },
    {
      id: "m4",
      home_college: "ES",
      away_college: "MC",
      home_college_score: 1,
      away_college_score: 0,
      home_college_participants: [],
      away_college_participants: [],
      sport: "Broomball",
      timestamp: new Date(
        new Date().getTime() - 2 * 24 * 60 * 60 * 1000
      ).toISOString(), // 2 days ago
      location: "Recreational Center",
      type: "Regular",
      division: "green",
      winner: "ES",
      forfeit: true,
      home_college_odds: 1.2,
      away_college_odds: 4.0,
    },
    {
      id: "m5",
      home_college: "MC",
      away_college: "MY",
      home_college_score: 0,
      away_college_score: 0,
      home_college_participants: [],
      away_college_participants: [],
      sport: "Cornhole",
      timestamp: new Date(
        new Date().getTime() + 10 * 24 * 60 * 60 * 1000
      ).toISOString(), // 10 days from now
      location: "Sterling",
      type: "Playoff",
      division: "none",
      winner: null,
      forfeit: false,
      playoff_bracket_slot: 2,
      next_match_id: "m6",
    },
    {
      id: "m6",
      home_college: "SY",
      away_college: "MC",
      home_college_score: 0,
      away_college_score: 0,
      home_college_participants: [],
      away_college_participants: [],
      sport: "Cornhole",
      timestamp: new Date(
        new Date().getTime() + 15 * 24 * 60 * 60 * 1000
      ).toISOString(), // 15 days from now
      location: "Sterling",
      type: "Playoff",
      division: "none",
      winner: null,
      forfeit: false,
    },
    {
      id: "m7",
      home_college: "MC",
      away_college: "ES",
      home_college_score: 0,
      away_college_score: 0,
      home_college_participants: [],
      away_college_participants: [],
      sport: "Flag Football",
      timestamp: new Date().toISOString(),
      location: "",
      type: "Bye",
      division: "none",
      winner: null,
      forfeit: false,
    },
  ];

  return (
    <div className="p-4">
      <MatchList matches={matches} />
    </div>
  );
};

export default UserMatches;
