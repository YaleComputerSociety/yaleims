import {
    groupByDate,
  } from "@src/data/helpers";

import TableRow from "./TableRow";

import { MatchesTableProps, Match } from "@src/types/components";


// Main MatchesTable Component
const MatchesTable: React.FC<MatchesTableProps> = ({ filteredMatches, handleCollegeClick }) => {

const onShowParticipants = (match: Match) => {
    // This could trigger a modal, display a dropdown, or anything else
    console.log("TODO");
};
const test = groupByDate(filteredMatches);

return (
    <>
    {Object.entries(test).map(([date, items]) => (
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
                handleCollegeClick = {handleCollegeClick}
            />
            ))}
        </div>
        </div>
    ))}
    </>
);
};

export default MatchesTable;