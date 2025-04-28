import Image from "next/image";
import { toCollegeName, emojiMap } from "@src/utils/helpers";
import { Match, Bet } from "@src/types/components";
import { useState } from "react";
import { useUser } from "../../context/UserContext";
import crypto from 'crypto';

const BetOption = ({ match, setSelectedOption, selectedOption, updateBetSlip }: { match: Match, setSelectedOption: Function, selectedOption: Bet | null, 
  updateBetSlip?: (bet: Bet) => Bet[]}) => {
  const { home_college, away_college } = match;
  
  const { user } = useUser();
  const [isBetAdded, setIsBetAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // const RadioOption = ({ value, college = null, label }: any) => (
  const RadioOption = ({
    value,
    college = null,
    label,
    odds,
  }: {
    value: string;
    college: string | null;
    label: string;
    odds: number;
  }) => (
    <label
      className={`relative flex items-center space-x-3 cursor-pointer group ${
        college ? "w-60" : "w-40"
      }`}
    >
      <div className="flex items-center space-x-4">
        <input
          type="radio"
          name={`prediction-${match.id}`}
          value={value}
          checked={selectedOption?.betOption === value}
          onChange={(e) => {
            // setSelectedOption(e.target.value);
            setSelectedOption({ 
              betOption: e.target.value, 
              betOdds: (1 * (1 + (1 - odds) / odds)), 
              home_college: match.home_college, 
              away_college: match.away_college,
              matchId: match.id.toString(),
              matchTimestamp: match.timestamp,
              sport: match.sport,
              won: null,
              betId: crypto.randomBytes(Math.ceil(10 / 2)).toString('hex').slice(0, 10)
            }); // Update both the option and odds
            // setSelectedOption(e.target.value.option);
            // setSelectedOdds(e.target.value.odds);
          }}
          className="peer hidden"
          // disabled={isBetAdded}
        />
        <span className="w-4 h-4 mg:w-5 mg:h-5 flex items-center justify-center border-2 rounded-full border-gray-400 peer-checked:bg-blue-500 dark:border-gray-600 dark:peer-checked:border-blue-400">
          <span className="w-2 h-2 mg:w-2.5 mg:h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 hidden peer-checked:block"></span>
        </span>
        <div className="flex items-center min-w-0 max-w-full">
          {college && (
            <Image
              src={`/college_flags/${toCollegeName[college]}.png`}
              alt={college}
              width={15}
              height={15}
              className="mr-2 object-contain flex-shrink-0"
              unoptimized
            />
          )}
          <span className="font-medium text-xs mg:text-mg text-gray-700 dark:text-gray-200 truncate">
            {label}
          </span>
        </div>
      </div>
    </label>
  );

  return (
    <div
      className={`bg-white dark:bg-black w-full border-t border-gray-200 dark:border-gray-700`}
    >
      {/* Main content */}
      <div className="p-3 flex justify-between flex-col mg:flex-row items-center">
        {/* Radio options and submit button container */}
        <div className="flex flex-col space-y-4">
          {/* Radio options */}
          <div className="flex flex-col md:flex-row gap-x-10">
            {/* Team options */}
            <div className="space-y-3 md:space-y-4 pr-12">
              <RadioOption
                value={home_college}
                odds={match.home_college_odds ?? 0} // Provide a fallback value if undefined
                // value={JSON.stringify({ option: home_college, odds: match.home_college_odds })}
                college={home_college}
                label={`${toCollegeName[home_college]} - ${
                  match.home_college_odds !== undefined
                    ? `${(100 * match.home_college_odds).toFixed(1)}% likely, ${(1 + (1 - match.home_college_odds) / match.home_college_odds).toFixed(2)}x returns`
                    : "Unknown odds"
                }`}
              />
              <RadioOption
                value={away_college}
                odds={match.away_college_odds ?? 0} // Provide a fallback value if undefined
                // value={JSON.stringify({ option: away_college, odds: match.away_college_odds })}
                college={away_college}
                label={`${toCollegeName[away_college]} - ${
                  match.away_college_odds !== undefined
                    ? `${(100 * match.away_college_odds).toFixed(1)}% likely, ${(1 * (1 + (1 - match.away_college_odds) / match.away_college_odds)).toFixed(2)}x returns`
                    : "Unknown odds"
                }`}
              />
            </div>

            {/* Draw and Default options */}
            <div className="space-y-3 md:space-y-4 mt-4 md:mt-0">
              <RadioOption
                college={null}
                value="Draw"
                odds={match.draw_odds ?? 0}
                // value={JSON.stringify({ option: "Draw", odds: match.draw_odds })}
                label={`Draw - ${
                  match.draw_odds !== undefined
                    ? `${(100 * match.draw_odds).toFixed(1)}% likely, ${(1 * (1 + (1 - match.draw_odds) / match.draw_odds)).toFixed(2)}x returns`
                    : "Unknown odds"
                }`}
              />
              <RadioOption
                college={null}
                value="Default"
                odds={match.default_odds ?? 0}
                // value={JSON.stringify({ option: "Default", odds: match.default_odds })}
                label={`Default - ${
                  match.default_odds !== undefined
                    ? `${(100 * match.default_odds).toFixed(1)}% likely, ${(1 * (1 + (1 - match.default_odds) / match.default_odds)).toFixed(2)}x returns`
                    : "Unknown odds"
                }`}
              />
            </div>
          </div>
        </div>
        <div>
          <button
            disabled={!selectedOption || isLoading}
            onClick={() => {
              if (selectedOption) {
                updateBetSlip && updateBetSlip(selectedOption);
                setSelectedOption(null)
                // setIsBetAdded(true)
              }}}
            className={`mt-2 w-full md:w-32 px-4 py-1.5 rounded-md text-xs mg:text-mg font-medium
            ${
              // isBetAdded
              //   ? "bg-green-500 text-white cursor-not-allowed"
              //   : selectedOption
              selectedOption
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }
          `}
          >
            {selectedOption
              ? "Add to Bet Slip"
              : "Add to Bet Slip"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetOption;
