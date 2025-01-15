import { groupBetByDate } from "@src/utils/helpers";

import TableRow from "./TableRowPending";

import { MatchesTableProps } from "@src/types/components";

// Main MatchesTable Component
const MatchesTable: React.FC<MatchesTableProps> = ({ pendingBets }) => {
  const test = groupBetByDate(pendingBets);

  return (
    <>
      {Object.entries(test)
        .slice(0, 3)
        .map(([date, items]) => (
          <div key={date} className="min-w-full rounded-lg mb-4">
            <div>
              <div className="text-left text-gray-700 p-2 bg-black-100 border-none dark:text-gray-300">
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long", // e.g., Monday
                  month: "long", // e.g., January
                  day: "numeric", // e.g., 20
                  year: "numeric", // e.g., 2025
                })}
              </div>
            </div>
            <div>
              {items.map((bet, index) => (
                <TableRow
                  key={index}
                  bet={bet}
                  isFirst={index === 0}
                  isLast={index === items.length - 1}
                />
              ))}
            </div>
          </div>
        ))}
    </>
  );
};

export default MatchesTable;
