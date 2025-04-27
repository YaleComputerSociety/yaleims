import Image from "next/image";
import { toCollegeName, sportsMap, emojiMap } from "@src/utils/helpers";
import { Match } from "@src/types/components";
import { Bet } from "@src/types/components";
import { SlArrowRight } from "react-icons/sl";
import { SlArrowDown } from "react-icons/sl";
import { useState } from "react";
import BetOption from "./BetOption";

const BetTemplate = (
    {match, isFirst, isLast, updateBetSlip} : 
      {match: Match, 
        isFirst: Boolean, 
        isLast: boolean, 
        updateBetSlip?: (bet: Bet) => Bet[]}
  ) => {
  const { home_college, away_college, sport, timestamp, type } = match;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Bet | null>(null);

  const CollegeDisplay = ({ college }: any) => (
    <div
      className={`cursor-pointer flex items-center flex-row$`}
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
    </div>
  );

  const getTimeString = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      className={`bg-white dark:bg-black ${isFirst ? "rounded-t-lg" : ""} ${isLast ? "rounded-b-lg" : ""}`}
      onClick={() => {
        setIsOpen(!isOpen)
      }}
    >
      <div className="block sm:hidden -mb-6">
        <div className="pr-3 py-2 pb-4 text-xs font-extralight dark:text-gray-300 text-gray-900 w-full flex justify-between">
          <span className="ml-11">{getTimeString(timestamp)}</span>
          <span>
            {type} {type == "Regular" ? "Season" : "Round"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_auto_1fr_auto_auto] items-center">
        <div className="pl-4">
          {!isOpen ? (
            <SlArrowRight
              className="cursor-pointer"
              onClick={() => {
                setIsOpen(!isOpen)
              }}
            />
          ) : (
            <SlArrowDown className="cursor-pointer" onClick={() => 
              {setSelectedOption(null)
              setIsOpen(!isOpen)}
            } />
          )}
        </div>
        <div className="hidden sm:block px-2 lg:px-6 pl-2 py-2 text-xs xs:text-sm text-gray-500 border-r border-gray-200 dark:border-gray-700">
          {getTimeString(timestamp).length < 8 ? <>&nbsp;{getTimeString(timestamp)}</> : getTimeString(timestamp)}
        </div>
        <div className="text-left lg:px-4 py-4 px-3 text-xs xs:text-sm grid xs:grid-cols-[0.3fr_0.2fr_0.3fr] grid-rows-1 grid-flow-col gap-2 items-center">
          <CollegeDisplay college={home_college} />
          <div>VS</div>
          <CollegeDisplay college={away_college} />
        </div>
        <div
          className="text-center px-4 py-1 relative group hover:cursor-pointer"
          title={sport}
        >
          <div>{emojiMap[sport]}</div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs xs:text-sm text-blue-600 bg-blue-100 border border-blue-600 dark:bg-black dark:text-white dark:border-black rounded opacity-0 group-hover:opacity-100">
            {sport}
          </div>
        </div>
        <div className="hidden sm:block text-center text-xs py-1 w-[100px] flex-col border-l border-gray-200 dark:border-gray-700">
          <div>{type}</div>
          {type == "Regular" ? "Season" : "Round"}
        </div>
      </div>
      <div
        className={`px-4 sm:px-8 transition-all duration-300 ease-out overflow-hidden ${
          isOpen ? "max-h-96 opacity-100 py-2" : "max-h-0 opacity-0 py-0 mb-0"
        }`}
      >
        <div className="" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-semibold mb-2 ml-2">
            Predict Game Results
          </h3>
          <BetOption match={match} setSelectedOption={setSelectedOption} selectedOption={selectedOption} updateBetSlip={updateBetSlip}/>
        </div>
      </div>
    </div>
  );
};

export default BetTemplate;
