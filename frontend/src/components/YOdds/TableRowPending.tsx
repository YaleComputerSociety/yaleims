import { FC, useState, useEffect } from "react";
import { emojiMap } from "@src/utils/helpers";
import { useUser } from "../../context/UserContext.jsx";
import Image from "next/image";
import Link from "next/link";
import { toCollegeName } from "@src/utils/helpers";

interface TableRowPendingProps {
  bet: {
    matchId: string;
    sport: string;
    betAmount: number;
    betOdds: number;
    betOption: string;
    matchTimestamp: string;
    home_college: string;
    away_college: string;
  };
  isFirst: boolean;
  isLast: boolean;
}

const TableRowPending: FC<TableRowPendingProps> = ({
  bet,
  isFirst,
  isLast,
}) => {
  const [reloadNow, setReloadNow] = useState(false);
  const { user } = useUser();
  const userEmail = user?.email;

  useEffect(() => {
    if (reloadNow) {
      window.location.reload();
    }
  }, [reloadNow]);

  const getTimeString = (timestamp: string) =>
    new Date(timestamp).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const handleDeleteBet = async () => {
    if (!userEmail) return;

    try {
      const response = await fetch(
        `https://us-central1-yims-125a2.cloudfunctions.net/deleteBet?email=${userEmail}&matchId=${bet.matchId}&sport=${bet.sport}&betAmount=${bet.betAmount}&betOdds=${bet.betOdds}&betOption=${bet.betOption}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error deleting bet: ${response.statusText}`);
      }

      await response.text();
      setReloadNow(true);
    } catch (error) {
      console.error("Failed to delete bet:", error);
    }
  };

  const CollegeDisplay = ({
    college,
    isSelected,
    isDraw,
    isDefault,
  }: {
    college: string;
    isSelected?: boolean;
    isDraw?: boolean;
    isDefault?: boolean;
  }) => {
    const bgColor = isDefault
      ? "bg-gray-300"
      : isDraw
      ? "bg-blue-300"
      : isSelected
      ? "bg-green-300"
      : "";

    return (
      <div className="text-xs xs:text-sm w-40 sm:w-52">
        <p
          className={`flex items-center  p-2 ${bgColor} ${
            bgColor ? "rounded-xl dark:text-black" : ""
          }`}
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
        </p>
      </div>
    );
  };

  const TimeDisplay = () => (
    <div className="-mb-6">
      <div className="flex justify-between w-full pr-3 py-2 pb-4 text-xs font-extralight text-gray-900 dark:text-white">
        <span className="ml-5">{getTimeString(bet.matchTimestamp)}</span>
        <span>
          {bet.sport}
          {emojiMap[bet.sport]}
        </span>
      </div>
    </div>
  );

  const BetDetails = () => (
    <div className="xs:grid sm:grid-cols-2 gap-2 items-center text-xs mr-5">
      <div className="text-right sm:text-center">
        <div className="flex flex-row">
          <p>Intial Amount:</p>
          <div className="flex flex-row justify-end">
            <p>{bet.betAmount}</p>
            <Image
              src="/YCoin.png"
              alt="YCoin"
              height={17} // Retains the specified height
              width={17} // Retains the specified width
              style={{ objectFit: "contain" }} // Proper usage of objectFit
            />
          </div>
        </div>

        <div className="flex flex-row justify-end">
          <p>
            Potential:{" "}
            {(bet.betAmount * (1 + (1 - bet.betOdds) / bet.betOdds)).toFixed(2)}{" "}
          </p>
          <Image
            src="/YCoin.png"
            alt="YCoin"
            height={17} // Retains the specified height
            width={17} // Retains the specified width
            style={{ objectFit: "contain" }} // Proper usage of objectFit
          />
        </div>
      </div>

      <div className="text-right">
        <button
          onClick={handleDeleteBet}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors mt-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const containerClasses = `
    bg-white dark:bg-black
    ${isFirst ? "rounded-t-lg" : ""}
    ${isLast ? "rounded-b-lg" : ""}
  `.trim();

  return (
    <div className={containerClasses}>
      <TimeDisplay />

      <div className="flex flex-wrap justify-between items-center">
        {/* Grid container for colleges */}
        <div className="sm:grid lg:grid-cols-[auto_auto] xl:grid-rows-1 grid-rows-2 grid-flow-col gap-2 items-center text-left px-3 lg:px-6 py-4 text-xs xs:text-sm">
          <CollegeDisplay
            college={bet.home_college}
            isSelected={bet.betOption === bet.home_college}
            isDraw={bet.betOption === "Draw"}
            isDefault={bet.betOption === "Default"}
          />
          {bet.away_college && bet.away_college !== "Bye" && (
            <CollegeDisplay
              college={bet.away_college}
              isSelected={bet.betOption === bet.away_college}
              isDraw={bet.betOption === "Draw"}
              isDefault={bet.betOption === "Default"}
            />
          )}
        </div>

        {/* Ensure this div is pushed to the end */}
        <div className="col-span-2 ml-auto mb-3 -mt-2 xl:mt-0">
          <BetDetails />
        </div>
      </div>
    </div>
  );
};

export default TableRowPending;
