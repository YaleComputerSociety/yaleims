import { groupByDate } from "@src/utils/helpers";

import TableRow from "./TableRow";
import BetTemplate from "./BetTemplate";

import { MatchesTableProps } from "@src/types/components";
import { set } from "date-fns";

// Main MatchesTable Component
const MatchesTable: React.FC<MatchesTableProps> = ({
  filteredMatches,
  updateBetSlip,
  availablePoints,
}) => {
  const test = groupByDate(filteredMatches);

  return (
    <>
      {Object.entries(test)
        .slice(0, 7)
        .map(([date, items]) => (
          <div key={date} className="min-w-full rounded-lg mb-4">
            <div>
              <div className="text-left text-gray-700 p-2 bg-black-100 border-none  dark:text-gray-300">
                {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="">
              {items.map((match, index) => (
                <BetTemplate
                  key={index}
                  match={match}
                  isFirst={index === 0} // Check if it's the first row
                  isLast={index === items.length - 1} // Check if it's the last row
                  updateBetSlip={updateBetSlip}
                />
              ))}
            </div>
          </div>
        ))}
    </>
  );
};

export default MatchesTable;
