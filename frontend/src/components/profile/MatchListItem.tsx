import React, { useState } from "react";
import { toast } from "react-toastify";
import { FaCalendar } from "react-icons/fa";
import { useUser } from "@/context/UserContext";
import { useSeason } from "@/context/SeasonContext";
import type { Match } from "@/lib/api/matches";
import { signUp, withdraw } from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";
import { calendarLink, matchTypeLabel } from "@/lib/format";

interface MatchListItemProps {
  match: Match;
  isSignedUp: boolean; // Initial state from parent
}

const MatchListItem: React.FC<MatchListItemProps> = ({ match, isSignedUp }) => {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedUpState, setIsSignedUp] = useState(isSignedUp);
  const [isHovered, setIsHovered] = useState(false);
  const sport = useSeason().currentSeason?.sports.find((s) => s.id === match.sportId);

  const changeSignUp = async (signed: boolean) => {
    setIsLoading(true);
    try {
      await (signed ? signUp : withdraw)(match.seasonId, match.id);
      setIsSignedUp(signed);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToGCal = () => {
    window.open(calendarLink(match, sport?.name ?? ""), "_blank");
  };

  const startsAt = new Date(match.startsAt);
  const matchDate = startsAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const matchTime = startsAt
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/^0/, ""); // Remove leading zero if present

  const location = match.venue || "Location TBD";

  // The session names the user's college.
  const isUserTeam =
    !!user &&
    (collegeName(match.homeCollegeId) === user.college || collegeName(match.awayCollegeId) === user.college);

  return (
    <li className="bg-white dark:bg-black shadow-lg p-4 rounded-lg hover:shadow-xl transition duration-300 ease-in-out">
      <div className="flex items-center">
        {/* Sport Emoji */}
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-3xl mr-1 hidden xs:block">
          {sport?.emoji}
        </div>

        {/* Match Details */}
        <div className="flex-grow flex flex-col space-y-1">
          <div className="flex text-xs sm:text-lg font-bold">
            {collegeName(match.homeCollegeId)} vs {collegeName(match.awayCollegeId)}
          </div>
          <div className="flex flex-row">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-semibold">
              {sport?.name}{" "}
              {match.stage === "regular" ? "Regular Season Match" : matchTypeLabel(match, false)}
            </div>
          </div>

          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {matchDate} at {matchTime}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {location} {match.venueDetail ?? ""}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-end space-y-2 gap-3 items-center">
          <button
            onClick={() => changeSignUp(!isSignedUpState)}
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

export default MatchListItem;
