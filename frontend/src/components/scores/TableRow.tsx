import Image from "next/image";
import TournamentBadge from "@/components/ui/TournamentBadge";
import { useState } from "react";
import { EditMatchButton } from "@/components/hub/admin/EditMatchModal";
import type { Match } from "@/lib/api/matches";
import type { Sport } from "@/lib/api/seasons";
import { collegeName } from "@/lib/colleges";
import { matchTypeLabel, pointsEarned } from "@/lib/format";
import { getCollegeFlag } from "@/lib/images";

interface TableRowProps {
  match: Match;
  sport: Sport | undefined;
  tournament: string | undefined;
  /** Called with the college's id. */
  handleCollegeClick: (collegeId: string) => void;
  /** Called with the sport's name. */
  handleSportClick: (sportName: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const TableRow: React.FC<TableRowProps> = ({
  match,
  sport,
  tournament,
  handleCollegeClick,
  isFirst,
  isLast,
  handleSportClick,
}) => {
  const [unscored, setUnscored] = useState(false);
  const sportName = sport?.name ?? "";
  const homeScore = match.result?.homeScore;
  const awayScore = match.result?.awayScore;
  const typeLabel = matchTypeLabel(match, tournament !== undefined);

  const getTimeString = (startsAt: string) => {
    return new Date(startsAt).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const CollegeDisplay = ({ college, isWinner, points }: { college: string | null; isWinner: boolean; points: number | null }) => (
    <div
      className={`cursor-pointer flex items-center flex-row${
        !isWinner ? "text-gray-400" : ""
      }`}
      onClick={() => college && handleCollegeClick(college)}
    >
      <Image
        src={getCollegeFlag(collegeName(college) ?? "")}
        alt={college ?? ""}
        width={20}
        height={20}
        className="mr-2 object-contain flex-none"
        unoptimized
      />
      <strong className="flex-shrink">{collegeName(college)} </strong>
      {!!points && (
        <div className="text-yellow-500 text-xs md:text-xs lg:text-xs font-bold items-center flex-grow">
          +{points}pts
        </div>
      )}
    </div>
  );

  const ScoreDisplay = ({
    homeScore,
    awayScore,
    type,
    isMobile = false,
  }: { homeScore?: number | null; awayScore?: number | null; type?: "first" | "second"; isMobile?: boolean }) => {
    const home = homeScore ?? 0;
    const away = awayScore ?? 0;
    if (isMobile) {
      // Mobile view: show single score
      const score = type === "first" ? homeScore : awayScore;
      const isWinning =
        type === "first" ? home > away : away > home;

      return (
        <div className="text-right">
          <strong className={!isWinning ? "text-gray-400" : ""}>
            {score || 0}
          </strong>
        </div>
      );
    }
    // Desktop view: show score comparison
    return (
      <div className="text-left hidden lg:block">
        <strong className={away > home ? "text-gray-400" : ""}>
          {home}
        </strong>
        {" - "}
        <strong className={home > away ? "text-gray-400" : ""}>
          {away}
        </strong>
      </div>
    );
  };

  const homePoints = pointsEarned(match, "home");
  const awayPoints = pointsEarned(match, "away");

  if (unscored) {
    return;
  }

  return (
    <div
      className={`bg-white dark:bg-black ${isFirst ? "rounded-t-lg" : ""} 
    ${isLast ? "rounded-b-lg" : ""}`}
    >
      <div className="block sm:hidden -mb-6">
        <div className="pr-3 py-2 pb-4 text-xs font-extralight dark:text-gray-300 text-gray-900 w-full flex justify-between items-center">
          <span className="ml-3 flex items-center gap-2">
            {getTimeString(match.startsAt)}
            <EditMatchButton match={match} setUnscored={setUnscored} />
          </span>
          <span className="flex items-center gap-2">
            <TournamentBadge name={tournament} />
            {typeLabel}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center">
        <div className="px-2 lg:px-6 pl-2 py-2 text-xs xs:text-sm text-gray-500 border-r border-gray-200 dark:border-gray-700 sm:flex hidden items-center justify-center gap-2">
          <span>
            {getTimeString(match.startsAt).length < 8 ? (
              <>&nbsp;{getTimeString(match.startsAt)}</>
            ) : (
              getTimeString(match.startsAt)
            )}
          </span>
          <EditMatchButton match={match} setUnscored={setUnscored} />
        </div>

        <div className="text-left lg:px-4 py-4 px-3 text-xs xs:text-sm grid lg:grid-cols-[0.6fr_0.4fr_0.6fr] lg:grid-rows-1 grid-rows-2 grid-flow-col gap-2 items-center">
          <CollegeDisplay college={match.homeCollegeId} isWinner={homePoints !== null} points={homePoints} />
          {/* Desktop score display */}
          <ScoreDisplay
            homeScore={homeScore}
            awayScore={awayScore}
            isMobile={false}
          />
          <div>
            <CollegeDisplay college={match.awayCollegeId} isWinner={awayPoints !== null} points={awayPoints} />
          </div>
          {/* Mobile score displays */}
          <div className="display lg:hidden">
            <ScoreDisplay
              homeScore={homeScore}
              awayScore={awayScore}
              isMobile={true}
              type="first"
            />
          </div>
          <div className="display lg:hidden">
            <ScoreDisplay
              homeScore={homeScore}
              awayScore={awayScore}
              isMobile={true}
              type="second"
            />
          </div>
        </div>

        <div
          className="text-center px-4 py-1 relative group hover:cursor-pointer"
          title={sportName}
          onClick={() => handleSportClick(sportName)}
        >
          <div>{sport?.emoji}</div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs xs:text-sm text-blue-600 bg-blue-100 border border-blue-600 dark:bg-black dark:text-white dark:border-black rounded opacity-0 group-hover:opacity-100">
            {sportName}
          </div>
        </div>
        <div className="hidden sm:flex text-center text-xs py-1 w-[100px] flex-col items-center justify-center gap-1 border-l border-gray-200 dark:border-gray-700">
          <div>{typeLabel}</div>
          <TournamentBadge compact name={tournament} />
        </div>
      </div>
    </div>
  );
};

export default TableRow;
