import React from "react";
import MatchListItem from "./MatchListItem";
import { Match } from "@src/types/components";

interface ListViewProps {
  matches: Match[];
  isSignedUp: boolean; // Determines initial state for MatchListItems
}

const ListView: React.FC<ListViewProps> = ({ matches, isSignedUp }) => {
  return (
    <div className="rounded-lg overflow-hidden shadow-lg bg-white dark:bg-black">
      {matches.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-200 p-6">
          No matches found.
        </div>
      ) : (
        <ul>
          {matches.map((match) => {
            return (
              <MatchListItem
                key={match.id}
                match={match}
                user={null} // Replace with actual user if needed
                isSignedUp={isSignedUp}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ListView;
