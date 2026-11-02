import { useState } from "react";
import { toast } from "react-toastify";
import { FaCalendar, FaSpinner } from "react-icons/fa";
import TournamentBadge from "@/components/ui/TournamentBadge";
import { EditMatchButton } from "@/components/hub/admin/EditMatchModal";
import type { Match } from "@/lib/api/matches";
import { fetchRoster, signUp, withdraw, type PublicRosterEntry } from "@/lib/api/roster";
import type { Sport } from "@/lib/api/seasons";
import { collegeName } from "@/lib/colleges";
import { calendarLink, matchTypeLabel } from "@/lib/format";
import type { SessionUser } from "@/types/api";

interface MatchListItemProps {
  match: Match;
  sport: Sport | undefined;
  tournament: string | undefined;
  user: SessionUser | null;
  isSignedUp: boolean;
  onStatusChange: (id: string, signed: boolean) => void;
}

const MatchListItem: React.FC<MatchListItemProps> = ({ match, sport, tournament, user, isSignedUp, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [participantsShow, setParticipantsShow] = useState(false);
  // The game's roster, read when the participants are first shown.
  const [roster, setRoster] = useState<PublicRosterEntry[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const homeParticipants = roster.filter((entry) => entry.collegeId === match.homeCollegeId);
  const awayParticipants = roster.filter((entry) => entry.collegeId === match.awayCollegeId);

  const startsAt = new Date(match.startsAt);
  const isPastMatch = startsAt < new Date();
  const sportName = sport?.name ?? "";

  const loadRoster = async () => {
    setIsLoadingParticipants(true);
    try {
      setRoster((await fetchRoster(match.seasonId, match.id)).items);
    } catch (error) {
      console.error("Error fetching match participants:", error);
      setRoster([]);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const changeSignUp = async (signed: boolean) => {
    setIsLoading(true);
    try {
      await (signed ? signUp : withdraw)(match.seasonId, match.id);
      onStatusChange(match.id, signed);
      if (participantsShow) await loadRoster();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToGCal = () => {
    window.open(calendarLink(match, sportName), "_blank");
  };

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

  const homeName = collegeName(match.homeCollegeId) ?? "";
  const awayName = collegeName(match.awayCollegeId) ?? "";
  const names = (entries: PublicRosterEntry[]) =>
    entries.map((entry, index) => (
      <span key={index}>
        {entry.name}
        {index < entries.length - 1 ? ", " : ""}
      </span>
    ));

  return (
    <li className="bg-white dark:bg-black shadow-lg p-4 rounded-lg hover:shadow-xl transition duration-300 ease-in-out max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          {/* Match Teams */}
          <div className="text-sm sm:text-lg font-bold">
            {homeName} vs {awayName} {sport?.emoji}
            <EditMatchButton match={match} />
          </div>

          {/* Match Sport */}
          <div className="text-sm sm:text-md text-gray-600 dark:text-gray-400 font-semibold flex flex-wrap items-center gap-2">
            <span>
              {sportName}{" "}
              {match.stage === "regular" ? "Regular Season Match" : matchTypeLabel(match, tournament !== undefined)}
            </span>
            <TournamentBadge name={tournament} />
          </div>

          {/* Match Date and Time */}
          <div className="text-xs sm:text-sm text-gray-500">
            {matchDate} at {matchTime}
          </div>

          {/* Match Location */}
          <div className="text-gray-500 text-xs sm:text-sm">
            {location} {match.venueDetail}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-0">
          {isPastMatch ? (
            // Show score for past matches
            <div className="text-sm sm:text-2xl font-bold ml-5">
              {match.result ? (
                <span>
                  {match.result.homeScore} - {match.result.awayScore}
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
                onClick={() => changeSignUp(!isSignedUp)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`ml-5 w-20 sm:w-36 text-xs sm:text-sm h-10 text-white rounded-lg shadow transition duration-200 ease-in-out ${
                  isLoading || !isUserTeam
                    ? "bg-gray-400 cursor-not-allowed"
                    : isSignedUp
                    ? "bg-green-600 hover:bg-red-600"
                    : "bg-blue-600 hover:scale-110"
                }`}
                disabled={isLoading || !isUserTeam}
              >
                {isLoading
                  ? "Loading..."
                  : !isUserTeam
                  ? "Not Your College"
                  : isSignedUp
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
            if (!participantsShow) await loadRoster();
            setParticipantsShow(!participantsShow);
          }}
        >
          Participants
        </button>
        {isLoadingParticipants ? (
          <div className="flex flex-row justify-end pt-3 w-full">
            <FaSpinner className="animate-spin" />{" "}
          </div>
        ) : (
          ""
        )}
        <div
          className={`transition-all duration-300 ${
            participantsShow ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden`}
        >
          <div>
            <span className="text-black dark:text-gray-400 font-semibold text-animate h-20">
              {homeName}:
            </span>{" "}
            {homeParticipants.length > 0 ? (
              names(homeParticipants)
            ) : (
              <span className="text-gray-500">None</span>
            )}
          </div>
          <div>
            <span className="text-black dark:text-gray-400 font-semibold">
              {awayName}:
            </span>{" "}
            {awayParticipants.length > 0 ? (
              names(awayParticipants)
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
