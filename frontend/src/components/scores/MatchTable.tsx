import { useSportOf } from "@/context/SeasonContext";
import { useTournamentNames } from "@/hooks/useTournamentNames";
import type { Match } from "@/lib/api/matches";
import { groupByDay } from "@/lib/format";
import TableRow from "./TableRow";

interface MatchesTableProps {
  /** Played games, from any seasons, in the order to show. */
  filteredMatches: Match[];
  handleCollegeClick: (collegeId: string) => void;
  handleSportClick: (sportName: string) => void;
}

/** The games grouped by day, one table per day. */
const MatchesTable: React.FC<MatchesTableProps> = ({ filteredMatches, handleCollegeClick, handleSportClick }) => {
  const sportOf = useSportOf(filteredMatches);
  const tournamentOf = useTournamentNames(filteredMatches);

  return (
    <>
      {[...groupByDay(filteredMatches)].map(([date, items]) => (
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
                key={`${match.seasonId}/${match.id}`}
                match={match}
                sport={sportOf(match)}
                tournament={tournamentOf(match)}
                isFirst={index === 0}
                isLast={index === items.length - 1}
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
