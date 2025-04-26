import React from "react";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import { BetParlay, BetParlayTableProps } from "@src/types/components";

/**
 * Displays parlays with bet details, an in‑row win/lose icon, the stake, and return.
 */
const BetParlayTable: React.FC<BetParlayTableProps> = ({ parlays }) => {
  if (!parlays.length) {
    return (
      <p className="text-center pt-4 text-sm text-gray-500 dark:text-gray-400">
        No bets found.
      </p>
    );
  }

  return (
    <div className="space-y-6 pt-4 pb-4 ">
      {parlays.map((parlay) => {
        const { betId, createdAt, betArray, betAmount, totalOdds, won } = parlay;
        const returnValue = won
          ? won === true ? parseFloat((betAmount * (1 + (1 - totalOdds) / totalOdds)).toFixed(2))
          : 0 : null;

        return (
          <div key={betId} className="rounded-lg border border-gray-200 dark:border-gray-700  shadow-sm">
            {/* header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                Bet&nbsp;#<span className="tracking-wider">{betId}</span>
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(createdAt).toLocaleString()}
              </span>
            </div>

            {/* bet list */}
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {betArray.map((bet, idx) => {
                const betWon = bet.winner != null && bet.winner === bet.betOption;
                return (
                  <li
                    key={`${betId}-${idx}`}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{bet.away_college}</span>
                      &nbsp;vs&nbsp;
                      <span className="font-medium">{bet.home_college}</span>
                      &nbsp;• {bet.sport}
                    </div>
                    <div className="mt-1 sm:mt-0 flex items-center text-xs text-gray-500 dark:text-gray-400">
                      Winner:&nbsp;{bet.winner ?? "Pending"}&nbsp;|&nbsp;Option:&nbsp;{bet.betOption}
                      {bet.winner == null ? <Loader className="ml-1 w-4 h-4 text-gray-400" /> : betWon ? (
                        <CheckCircle className="ml-1 w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="ml-1 w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* footer with stake & return */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-b-lg text-sm text-gray-600 dark:text-gray-400">
              <span>
                Bet amount:&nbsp;<span className="font-semibold">{betAmount}</span>
              </span>
              <span className="flex flex-row items-center">
                Return:&nbsp;<span className="font-semibold">{won === null ? <Loader className="ml-1 w-4 h-4 text-gray-400" /> : won ? returnValue : 0}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BetParlayTable;
