import { groupBetByDate } from "@src/utils/helpers";

import TableRowPending from "./TableRowPending";

import { PendingMatchesTableProps } from "@src/types/components";

// Main MatchesTable Component
const MatchesTable: React.FC<PendingMatchesTableProps> = ({ pendingBets }) => {
  const test = groupBetByDate(pendingBets);

  return (
    <>
      {Object.entries(test)
        .slice(0, 3)
        .map(([date, items]) => (
          <div key={date} className="min-w-full rounded-lg mb-4">
            <div>
              <div className="text-left text-gray-700 p-2 bg-black-100 border-none dark:text-gray-300">
                {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            <div>
              {items.map((bet, index) => (
                <TableRowPending
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
