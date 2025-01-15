import Image from "next/image";
import { toCollegeName, sportsMap, emojiMap } from "@src/utils/helpers";
import { TableRowProps } from "@src/types/components";
import { SlArrowRight } from "react-icons/sl";
import { SlArrowDown } from "react-icons/sl";
import { useState } from "react";
import Link from "next/link";

const TableRow: React.FC<TableRowProps> = ({
  match,
  handleCollegeClick,
  isFirst,
  isLast,
  handleSportClick,
}) => {
  const {
    home_college,
    away_college,
    home_college_score,
    away_college_score,
    sport,
    timestamp,
  } = match;

  const [isOpen, setIsOpen] = useState(false);

  const getTimeString = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const CollegeDisplay = ({ college, score, isWinner, points = 0 }: any) => (
    <div className="items-start text-xs xs:text-sm">
      <strong
        className={`cursor-pointer flex items-center ${
          !isWinner ? "text-gray-400" : ""
        }`}
        onClick={() => handleCollegeClick(college)}
      >
        <Image
          src={`/college_flags/${toCollegeName[college]}.png`}
          alt={college}
          width={20}
          height={20}
          className="mr-2 object-contain"
          unoptimized
        />
        {toCollegeName[college]}
        {points > 0 && (
          <span className="text-yellow-500 text-xs xs:text-sm">
            +{points}pts
          </span>
        )}
      </strong>
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

  const isDraw = home_college_score === away_college_score;
  const homeWins = home_college_score > away_college_score;
  const points = isDraw ? sportsMap[sport] / 2 : sportsMap[sport];

  return (
    <div
      className={`bg-white dark:bg-black ${isFirst ? "rounded-t-lg" : ""} 
    ${isLast ? "rounded-b-lg" : ""}`}
    >
      <div className="block sm:hidden -mb-6">
        <div className="pr-3 py-2 pb-4 text-xs font-extralight text-gray-900 w-full flex justify-between">
          <span className="ml-11">{getTimeString(timestamp)}</span>
          <span>
            {match.type} {match.type == "Regular" ? "Season" : "Round"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_auto_1fr_auto_auto] items-center">
        <div className="pl-4">
          {!isOpen ? (
            <SlArrowRight onClick={() => setIsOpen(!isOpen)} />
          ) : (
            <SlArrowDown onClick={() => setIsOpen(!isOpen)} />
          )}
        </div>
        <div className="hidden sm:block lg:px-6 pl-2 lg:pr-10 py-4 text-xs xs:text-sm text-gray-500">
          {getTimeString(timestamp)}
        </div>

        <div className="text-left lg:px-6 py-4 px-3 text-xs xs:text-sm grid lg:grid-cols-[0.6fr_0.4fr_0.6fr] lg:grid-rows-1 grid-rows-2 grid-flow-col gap-2 items-center">
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
          className="text-center px-2 py-1 relative group hover:cursor-pointer"
          title={sport}
          onClick={() => handleSportClick(sport)}
        >
          <div>{emojiMap[sport]}</div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs xs:text-sm text-blue-600 bg-blue-100 border border-blue-600 dark:bg-black dark:text-white dark:border-black rounded opacity-0 group-hover:opacity-100">
            {sport}
          </div>
        </div>
        <div className="hidden sm:block text-center text-xs px-2 py-1 w-[100px] flex flex-col">
          <div>{match.type}</div>
          {match.type == "Regular" ? "Season" : "Round"}
        </div>
      </div>
      {isOpen ? (
        <div className="text-center text-xs italic transition-[height] duration-300 ease-out h-10 overflow-hidden">
          No Yodds data available for this match. Predict game outcomes{" "}
          <Link href={"/yodds"} className="text-blue-400">
            here.
          </Link>
        </div>
      ) : (
        <div className="transition-[height] duration-300 ease-out h-0 overflow-hidden">
          <div className="text-center text-xs pb-5 italic">
            No Yodds data available for this match. Predict game outcomes{" "}
            <Link href={"/yodds"} className="text-blue-400">
              here.
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableRow;
