import Image from "next/image";
import { toCollegeName, emojiMap } from "@src/utils/helpers";
import { TableRowProps } from "@src/types/components";
import { useState } from "react";
import { useUser } from "../../context/UserContext.jsx";

const TableRow: React.FC<TableRowProps> = ({ match, isFirst, isLast }) => {
  const { home_college, away_college, sport, timestamp, type } = match;
  const [selectedOption, setSelectedOption] = useState<string>("");
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
    away_college,
    home_college,
    sport,
  }: {
    email: string;
    matchId: string;
    betAmount: number;
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

      console.log("Bet added successfully!");
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

    const betAmount = coins;
    const availablePoints = user.points || 0;

    if (availablePoints < 1) {
      alert("You don't have enough Ycoins");
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
        betOption: selectedOption,
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

  const RadioOption = ({ value, college = null, label }: any) => (
    <label
      className={`relative flex items-center space-x-3 cursor-pointer group ${
        college ? "w-72" : "w-40"
      }`}
    >
      <div className="flex items-center space-x-4">
        <input
          type="radio"
          name={`prediction-${match.id}`}
          value={value}
          checked={selectedOption === value}
          onChange={(e) => {
            setSelectedOption(e.target.value);
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
          <div className="flex flex-col md:flex-row gap-2 justify-between">
            {/* Team options */}
            <div className="space-y-3 md:space-y-4">
              <RadioOption
                value={home_college}
                college={home_college}
                label={`${toCollegeName[home_college]} Wins (25% odds)`}
              />
              <RadioOption
                value={away_college}
                college={away_college}
                label={`${toCollegeName[away_college]} Wins (25% odds)`}
              />
            </div>

            {/* Draw and Default options */}
            <div className="space-y-3 md:space-y-4 ">
              <RadioOption value="Draw" label="Draw (25% odds)" />
              <RadioOption value="Default" label="Default (25% odds)" />
            </div>

            {/* Coin input and submit button column */}
            <div className="flex flex-col md:justify-start sm:-mt-2">
              {/* Coin input field */}
              <div className="w-full md:w-48">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={coins || ""}
                  onChange={(e) => handleCoinChange(e.target.value)}
                  disabled={isSubmitted}
                  placeholder="Enter coins"
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
