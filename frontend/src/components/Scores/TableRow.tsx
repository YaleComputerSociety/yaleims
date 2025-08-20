import Image from "next/image";
import { toCollegeName, sportsMap, emojiMap } from "@src/utils/helpers";
import { TableRowProps } from "@src/types/components";
import { SlArrowRight } from "react-icons/sl";
import { SlArrowDown } from "react-icons/sl";
import { useState } from "react";
import Link from "next/link";
import UndoScoreMatchModal from "../AddScores/UndoScoreMatchModal";

const TableRow: React.FC<TableRowProps> = ({
  match,
  handleCollegeClick,
  isFirst,
  isLast,
  handleSportClick,
  isAdmin,
}) => {
  const {
    home_college,
    away_college,
    home_college_score,
    away_college_score,
    sport,
    timestamp,
    home_volume,
    away_volume,
    draw_volume,
    default_volume,
    winner,
    forfeit,
    id: matchId,
  } = match;

  const [isOpen, setIsOpen] = useState(false);
  const [undoScoreModalOpen, setUndoScoreModalOpen] = useState(false);
  const [unscored, setUnscored] = useState(false);

  // Check if prediction data exists
  const hasPredictionData =
    home_volume !== 0 ||
    away_volume !== 0 ||
    draw_volume !== 0 ||
    default_volume !== 0;

  // Calculate correct and incorrect predictions
  const totalPredicted =
    (home_volume ?? 0) +
    (away_volume ?? 0) +
    (draw_volume ?? 0) +
    (default_volume ?? 0);

  const correctPredicted =
    (home_college_score > away_college_score ? home_volume ?? 0 : 0) +
    (away_college_score > home_college_score ? away_volume ?? 0 : 0) +
    (winner === "Tie" ? draw_volume ?? 0 : 0) +
    (winner === "Default" ? default_volume ?? 0 : 0);

  const incorrectPredicted = totalPredicted - correctPredicted;

  // Calculate bar widths
  const correctPercentage: string =
    totalPredicted > 0
      ? ((correctPredicted / totalPredicted) * 100).toFixed(2)
      : "0.00";
  const incorrectPercentage =
    totalPredicted > 0 ? (100 - Number(correctPercentage)).toFixed(2) : "0.00";

  const getTimeString = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const CollegeDisplay = ({ college, score, isWinner, points }: any) => (
    <div
      className={`cursor-pointer flex items-center flex-row${
        !isWinner ? "text-gray-400" : ""
      }`}
      onClick={() => handleCollegeClick(college)}
    >
      <Image
        src={`/college_flags/${toCollegeName[college]}.png`}
        alt={college}
        width={20}
        height={20}
        className="mr-2 object-contain flex-none"
        unoptimized
      />
      <strong className="flex-shrink">{toCollegeName[college]} </strong>
      {points > 0 && (
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
  }: any) => {
    if (isMobile) {
      // Mobile view: show single score
      const score = type === "first" ? homeScore : awayScore;
      const isWinning =
        type === "first" ? homeScore > awayScore : awayScore > homeScore;

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
        <strong className={awayScore > homeScore ? "text-gray-400" : ""}>
          {homeScore || 0}
        </strong>
        {" - "}
        <strong className={homeScore > awayScore ? "text-gray-400" : ""}>
          {awayScore || 0}
        </strong>
      </div>
    );
  };

  const handleIdClick = () => {
    setUndoScoreModalOpen(true);
  };

  const isDefault = winner === "Default";
  const isDraw =
    (!forfeit && home_college_score === away_college_score) || isDefault;
  const homeWins = winner === home_college;
  const points = isDraw ? sportsMap[sport] / 2 : sportsMap[sport];

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
          <span className="ml-11 flex items-center gap-2">
            {getTimeString(timestamp)}
            {isAdmin && (
              <span
                onClick={handleIdClick}
                className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 font-mono text-[10px] border border-gray-200 dark:border-gray-700 cursor-pointer"
              >
                ID: {matchId}
              </span>
            )}
          </span>
          <span>
            {match.type} {match.type == "Regular" ? "Season" : "Round"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_auto_1fr_auto_auto] items-center">
        <div className="pl-4">
          {!isOpen ? (
            <SlArrowRight
              onClick={() => {
                setIsOpen(!isOpen);
              }}
            />
          ) : (
            <SlArrowDown onClick={() => setIsOpen(!isOpen)} />
          )}
        </div>
        <div className="px-2 lg:px-6 pl-2 py-2 text-xs xs:text-sm text-gray-500 border-r border-gray-200 dark:border-gray-700 sm:flex hidden items-center justify-center gap-2">
          <span>
            {getTimeString(timestamp).length < 8 ? (
              <>&nbsp;{getTimeString(timestamp)}</>
            ) : (
              getTimeString(timestamp)
            )}
          </span>
          {isAdmin && (
            <span
              onClick={handleIdClick}
              className="ml-2 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 font-mono text-[10px] border border-gray-200 dark:border-gray-700 cursor-pointer"
            >
              ID: {matchId}
            </span>
          )}
        </div>

        <div className="text-left lg:px-4 py-4 px-3 text-xs xs:text-sm grid lg:grid-cols-[0.6fr_0.4fr_0.6fr] lg:grid-rows-1 grid-rows-2 grid-flow-col gap-2 items-center">
          <CollegeDisplay
            college={home_college}
            score={home_college_score}
            isWinner={homeWins || isDraw}
            points={homeWins || isDraw ? points : 0}
          />
          {/* Desktop score display */}
          <ScoreDisplay
            homeScore={home_college_score}
            awayScore={away_college_score}
            isMobile={false}
          />
          {away_college !== "Bye" ? (
            <div>
              <CollegeDisplay
                college={away_college}
                score={away_college_score}
                isWinner={!homeWins || isDraw}
                points={!homeWins || isDraw ? points : 0}
              />
            </div>
          ) : (
            <div className="pl-7 font-bold">BYE</div>
          )}
          {/* Mobile score displays */}
          <div className="display lg:hidden">
            <ScoreDisplay
              homeScore={home_college_score}
              awayScore={away_college_score}
              isMobile={true}
              type="first"
            />
          </div>
          <div className="display lg:hidden">
            <ScoreDisplay
              homeScore={home_college_score}
              awayScore={away_college_score}
              isMobile={true}
              type="second"
            />
          </div>
        </div>

        <div
          className="text-center px-4 py-1 relative group hover:cursor-pointer"
          title={sport}
          onClick={() => handleSportClick(sport)}
        >
          <div>{emojiMap[sport]}</div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs xs:text-sm text-blue-600 bg-blue-100 border border-blue-600 dark:bg-black dark:text-white dark:border-black rounded opacity-0 group-hover:opacity-100">
            {sport}
          </div>
        </div>
        <div className="hidden sm:block text-center text-xs py-1 w-[100px] flex flex-col border-l border-gray-200 dark:border-gray-700">
          <div>{match.type}</div>
          {match.type == "Regular" ? "Season" : "Round"}
        </div>
      </div>
      {/* Bar Graph for Predictions */}
      {hasPredictionData && isOpen ? (
        <div className="px-4 sm:px-8 py-2 mb-3 transition-[height] duration-300 ease-out h-20 overflow-hidden">
          <h3 className="text-sm font-semibold mb-2 ml-2">
            Prediction Results
          </h3>
          <div className="flex items-center">
            <div
              className="h-2 bg-green-500 rounded-l-lg"
              style={{ width: `${correctPercentage}%` }}
              title={`${correctPredicted} Correct`}
            ></div>
            <div
              className="h-2 bg-gray-200 dark:bg-gray-800 rounded-r-lg"
              style={{ width: `${incorrectPercentage}%` }}
              title={`${incorrectPredicted} Incorrect`}
            ></div>
          </div>
          <div className="text-xs mt-1 ml-2">
            Correct: {correctPredicted} YCoins, Incorrect: {incorrectPredicted}{" "}
            YCoins
          </div>
        </div>
      ) : (
        <div className="transition-[height] duration-300 ease-out h-0 overflow-hidden"></div>
      )}

      {!hasPredictionData && isOpen ? (
        <div className="text-center text-xs italic transition-[height] duration-300 ease-out h-10 overflow-hidden">
          No prediction data available for this match. Predict game outcomes{" "}
          <Link href={"odds"} className="text-blue-400">
            here.
          </Link>
        </div>
      ) : (
        <div className="transition-[height] duration-300 ease-out h-0 overflow-hidden">
          <div className="text-center text-xs pb-5 italic px-1">
            No prediction data available for this match. Predict game outcomes{" "}
            <Link href={"odds"} className="text-blue-400">
              here.
            </Link>
          </div>
        </div>
      )}

      {undoScoreModalOpen && (
        <UndoScoreMatchModal
          unscoreId={matchId}
          setShowConfirmation={setUndoScoreModalOpen}
          match={match}
          setUnscored={setUnscored}
        />
      )}
    </div>
  );
};

export default TableRow;
