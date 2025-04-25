import { FC, useState, useEffect } from "react";
import { emojiMap } from "@src/utils/helpers";
import { useUser } from "../../context/UserContext";
import Image from "next/image";
import Link from "next/link";
import { toCollegeName } from "@src/utils/helpers";
import { resolve } from "path";
import { Bet } from "@src/types/components";
import { useBetState } from "../../context/BetContext";

interface BetSlipProps {
  bet: Bet;
  isFirst: boolean;
  isLast: boolean;
  removeBet: (bet: Bet) => Bet[];
}

const betSlipRow: FC<BetSlipProps> = ({
  bet,
  isFirst,
  isLast,
  removeBet
}) => {
  const [reloadNow, setReloadNow] = useState(false);
  const { user } = useUser();
  const [isBetAdded, setIsBetAdded] = useBetState();
  const userEmail = user?.email;

  useEffect(() => {
    if (reloadNow) {
      window.location.reload();
    }
  }, [reloadNow]);

  const getTimeString = (timestamp: string) => {
    console.log("timestamp", timestamp)
    return new Date(timestamp).toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

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
      <div className="flex items-center justify-between px-3 py-2 text-xs font-extralight text-gray-900 dark:text-gray-400 w-full">
        <div className="flex items-center space-x-2">
          <span>
            {getTimeString(bet.matchTimestamp)} | {bet.sport}
          </span>
          <span className="text-lg">{emojiMap[bet.sport]}</span>
        </div>
      </div>
  );

  const BetDetails = () => (
    <div className="xs:grid sm:grid-cols-2 gap-2 items-center text-xs mr-5">
      <div className="text-right sm:text-center">
        <div className="flex flex-row">
          <p>Odds: </p>
          <div className="flex flex-row justify-end">
            <p>{bet.betOdds}</p>
          </div>
        </div>
      </div>
      <div className="text-right">
        <button
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors mt-1"
          onClick={() => {
            removeBet(bet);
            setIsBetAdded(false);
          }}
        >
          Remove
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

export default betSlipRow;
