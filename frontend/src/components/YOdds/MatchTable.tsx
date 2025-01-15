import { groupByDate } from "@src/utils/helpers";

import TableRow from "./TableRow";

import { MatchesTableProps } from "@src/types/components";

// Main MatchesTable Component
const MatchesTable: React.FC<MatchesTableProps> = ({
  filteredMatches,
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
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long", // e.g., Monday
                  month: "long", // e.g., January
                  day: "numeric", // e.g., 20
                  year: "numeric", // e.g., 2025
                })}
              </div>
            </div>
            <div className="">
              {items.map((match, index) => (
                <TableRow
                  key={index}
                  match={match}
                  availablePoints={availablePoints}
                  isFirst={index === 0} // Check if it's the first row
                  isLast={index === items.length - 1} // Check if it's the last row
                />
              ))}
            </div>
          </div>
        ))}
    </>
  );
};

export default MatchesTable;
