import { groupByDate } from "@src/utils/helpers";

import TableRow from "./TableRow";

import { MatchesTableProps } from "@src/types/components";

// Main MatchesTable Component
const MatchesTable: React.FC<MatchesTableProps> = ({
  filteredMatches,
  handleCollegeClick,
  handleSportClick,
}) => {
  const test = groupByDate(filteredMatches);

  return (
    <>
      {Object.entries(test).map(([date, items]) => (
        <div key={date} className="min-w-full rounded-lg mb-4">
          <div>
            <div className="text-left p-2 bg-black-100 border-none">
              {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
          <div>
            {items.map((match, index) => (
              <TableRow
                key={index}
                match={match}
                isFirst={index === 0} // Check if it's the first row
                isLast={index === items.length - 1} // Check if it's the last row
                handleCollegeClick={handleCollegeClick}
                handleSportClick={handleSportClick}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

export default MatchesTable;
