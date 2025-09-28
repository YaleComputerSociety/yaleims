"use client";

import React from "react";
import BracketCell from "./BracketCell";
import { useSeason } from "@src/context/SeasonContext";

interface FirestoreMatch {
  bracket_placement: number;
  match_id: string;
  round: string;
}

interface BracketProps {
  matches: FirestoreMatch[];
}

const Bracket: React.FC<BracketProps> = ({ matches }) => {
  const { currentSeason } = useSeason();

  if (!currentSeason) {
    return <div>Loading...</div>;
  }
  return (
    <div className="flex flex-row flex-wrap gap-4">
      {matches.map((match) => (
        <BracketCell season={currentSeason.year} key={match.match_id} matchId={match.match_id} />
      ))}
    </div>
  );
};

export default Bracket;
