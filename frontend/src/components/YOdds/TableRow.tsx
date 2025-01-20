import Image from "next/image";
import { toCollegeName, emojiMap } from "@src/utils/helpers";
import { YoddsTableRowProps } from "@src/types/components";
import { useState } from "react";
import { useUser } from "../../context/UserContext.jsx";

const TableRow: React.FC<YoddsTableRowProps> = ({
  match,
  isFirst,
  isLast,
  availablePoints,
}) => {
  const { home_college, away_college, sport, timestamp, type } = match;
  // const [selectedOption, setSelectedOption] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState<{
    option: string;
    odds: number;
  }>({ option: "", odds: 0 });
  const [selectedOdds, setSelectedOdds] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const { user } = useUser();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isBetAdded, setIsBetAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getTimeString = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const addBet = async ({
    email,
    matchId,
    betAmount,
    betOption,
    betOdds,
    away_college,
    home_college,
    sport,
  }: {
    email: string;
    matchId: string;
    betAmount: number;
    betOdds: number;
    betOption: string;
    away_college: string;
    home_college: string;
    sport: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/addBet",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            matchId,
            betAmount,
            betOdds,
            betOption,
            away_college,
            home_college,
            sport,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Response not OK: ${response.status} - ${errorBody}`);
        throw new Error(`Failed to add bet: ${errorBody}`);
      }

      setIsBetAdded(true);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to add bet:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.email) {
      alert("Please log in to place a bet");
      return;
    }

    if (!selectedOption.option || selectedOption.odds <= 0) {
      alert("Please select a valid option.");
      return;
    }

    const betAmount = coins;

    if (!availablePoints || availablePoints < 1) {
      alert("You don't have enough YCoins");
      return;
    } else if (betAmount < 1 || betAmount > Math.min(250, availablePoints)) {
      alert(`Value must be between 1 and ${Math.min(250, availablePoints)}.`);
      return;
    }

    try {
      await addBet({
        email: user.email,
        matchId: match.id.toString(),
        betAmount,
        betOdds: selectedOption.odds,
        betOption: selectedOption.option,
        // betOdds: selectedOdds,
        // betOption: selectedOption,
        away_college: match.away_college,
        home_college: match.home_college,
        sport: match.sport,
      });
    } catch (error) {
      alert("Failed to place bet. Please try again.");
    }
  };

  const handleCoinChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setCoins(Math.max(0, Math.min(numValue, 1000))); // Limit to 0-1000 coins
  };

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
          checked={selectedOption.option === value}
          onChange={(e) => {
            // setSelectedOption(e.target.value);
            setSelectedOption({ option: e.target.value, odds }); // Update both the option and odds
            // setSelectedOption(e.target.value.option);
            // setSelectedOdds(e.target.value.odds);
          }}
          className="peer hidden"
          disabled={isSubmitted}
        />
        <span className="w-4 h-4 mg:w-5 mg:h-5 flex items-center justify-center border-2 rounded-full border-gray-300 peer-checked:bg-blue-500 dark:border-gray-600 dark:peer-checked:border-blue-400">
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
      className={`
      bg-white dark:bg-black 
      ${isFirst ? "rounded-t-lg" : ""} 
      ${isLast ? "rounded-b-lg" : ""}
      border-b dark:border-gray-800
    `}
    >
      {/* Match Info Header (Mobile & Desktop) */}
      <div className="flex items-center justify-between px-3 py-2 text-xs font-extralight text-gray-900 dark:text-gray-400 w-full">
        <div className="flex items-center space-x-2">
          <span>
            {getTimeString(timestamp)} | {sport}
          </span>
          <span className="text-lg">{emojiMap[sport]}</span>
        </div>
        <span>
          {type} {type === "Regular" ? "Season" : "Round"}
        </span>
      </div>

      {/* Main content */}
      <div className="p-3">
        {/* Radio options and submit button container */}
        <div className="flex flex-col space-y-4">
          {/* Radio options */}
          <div className="flex flex-col md:flex-row justify-between">
            {/* Team options */}
            <div className="space-y-3 md:space-y-4">
              <RadioOption
                value={home_college}
                odds={match.home_college_odds ?? 0} // Provide a fallback value if undefined
                // value={JSON.stringify({ option: home_college, odds: match.home_college_odds })}
                college={home_college}
                label={`${toCollegeName[home_college]} - ${
                  match.home_college_odds !== undefined
                    ? `${(100 * match.home_college_odds).toFixed(1)}% likely`
                    : "Unknown odds"
                }`}
              />
              <RadioOption
                value={away_college}
                odds={match.home_college_odds ?? 0} // Provide a fallback value if undefined
                // value={JSON.stringify({ option: away_college, odds: match.away_college_odds })}
                college={away_college}
                label={`${toCollegeName[away_college]} - ${
                  match.away_college_odds !== undefined
                    ? `${(100 * match.away_college_odds).toFixed(1)}% likely`
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
                    ? `${(100 * match.draw_odds).toFixed(1)}% likely`
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
                    ? `${(100 * match.default_odds).toFixed(1)}% likely`
                    : "Unknown odds"
                }`}
              />
            </div>

            {/* Coin input and submit button column */}
            <div className="flex flex-col md:justify-start md:-mt-2 md:ml-4 mt-3">
              {/* Coin input field */}
              <div className="w-full md:w-48">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={coins || ""}
                  onChange={(e) => handleCoinChange(e.target.value)}
                  disabled={isSubmitted}
                  placeholder="Enter YCoins"
                  className="w-full md:w-32 px-2 py-1.5 text-xs mg:text-mg border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900"
                />
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!selectedOption || !coins || isSubmitted || isLoading}
                className={`mt-2 w-full md:w-32 px-4 py-1.5 rounded-md text-xs mg:text-mg font-medium
                ${
                  isSubmitted
                    ? "bg-green-500 text-white cursor-not-allowed"
                    : isLoading
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : selectedOption && coins
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }
              `}
              >
                {isSubmitted
                  ? "Prediction Placed"
                  : isLoading
                  ? "Placing..."
                  : "Predict"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableRow;
