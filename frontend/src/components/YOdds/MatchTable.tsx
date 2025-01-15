import { groupByDate } from "@src/utils/helpers";

import TableRow from "./TableRow";

import { MatchesTableProps } from "@src/types/components";

// Main MatchesTable Component
const MatchesTable: React.FC<MatchesTableProps> = ({
  filteredMatches,
  handleCollegeClick,
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
              <div className="text-left text-gray-700 p-2 bg-black-100 border-none">
                {date}
              </div>
            </div>
            <div>
              {items.map((match, index) => (
                <TableRow
                  key={index}
                  match={match}
                  handleCollegeClick={handleCollegeClick}
                  availablePoints={availablePoints}
                />
              ))}
            </div>
          </div>
        ))}
    </>
  );
};

export default MatchesTable;
