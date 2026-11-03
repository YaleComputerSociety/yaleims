import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FaCalendar } from "react-icons/fa";
import { useSession } from "@/context/SessionContext";
import { useSeason } from "@/context/SeasonContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { fetchMyMatches, type MyMatch } from "@/lib/api/me";
import MyEntryStatus from "@/components/games/MyEntryStatus";
import { signUp, withdraw } from "@/lib/api/roster";
import type { Sport } from "@/lib/api/seasons";
import { collegeName } from "@/lib/colleges";
import { calendarLink, groupByDay, matchTypeLabel } from "@/lib/format";

interface MatchListItemProps {
  match: MyMatch;
  sport: Sport | undefined;
  /** Rounded corners for its place in the day's list. */
  roundedClass?: string;
}

/** One of the user's games, with withdrawing (and signing up again) and a calendar link. */
const MatchListItem: React.FC<MatchListItemProps> = ({ match, sport, roundedClass = "" }) => {
  const { viewer } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedUpState, setIsSignedUp] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

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

  const isUserTeam =
    !!viewer?.collegeId &&
    (match.homeCollegeId === viewer.collegeId || match.awayCollegeId === viewer.collegeId);

  return (
    <li
      className={`bg-white dark:bg-black shadow-lg p-4 ${roundedClass} hover:shadow-xl transition duration-300 ease-in-out`}
    >
      <div className="flex items-center">
        {/* Sport Emoji */}
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-3xl mr-1 hidden xs:block">
          {sport?.emoji}
        </div>

        {/* Match Details */}
        <div className="flex-grow flex flex-col space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-lg font-bold">
            {collegeName(match.homeCollegeId)} vs {collegeName(match.awayCollegeId)}
            <MyEntryStatus mine={match.mine} started={false} />
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
            {location}
            {match.venueDetail ? ", " + match.venueDetail : ""}
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

/** The games grouped by day. */
const MatchList: React.FC<{ matches: MyMatch[] }> = ({ matches }) => {
  const sports = useSeason().currentSeason?.sports ?? [];
  const matchesByDate = groupByDay(matches);

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
      <div className="text-center text-gray-600 dark:text-gray-400 py-4 text-sm">
        No upcoming matches. Sign up on the Schedules page!
      </div>
    );
  }

  return (
    <div>
      {[...matchesByDate].map(([date, matches]) => (
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
                  key={match.id}
                  match={match}
                  sport={sports.find((sport) => sport.id === match.sportId)}
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

/** The games the user signed up for that haven't started, this season. */
const UserMatches = () => {
  const [matches, setMatches] = useState<MyMatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { currentSeason } = useSeason();

  useEffect(() => {
    if (!currentSeason) return;
    let live = true;
    setIsLoading(true);
    fetchMyMatches({ seasonId: currentSeason.id, upcoming: true })
      .then(
        ({ items }) => live && setMatches(items),
        (error) => console.error("Failed to fetch user matches:", error)
      )
      .finally(() => live && setIsLoading(false));
    return () => {
      live = false;
    };
  }, [currentSeason]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      <MatchList matches={matches} />
    </div>
  );
};

export default UserMatches;
