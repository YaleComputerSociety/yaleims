"use client";

import React from "react";
import BracketCell from "./BracketCell";

interface FirestoreMatch {
  bracket_placement: number;
  match_id: string;
  round: string;
}

interface BracketProps {
  matches: FirestoreMatch[];
}

const Bracket: React.FC<BracketProps> = ({ matches }) => {
  return (
    <div className="flex flex-row flex-wrap gap-4">
      {matches.map((match) => (
        <BracketCell key={match.match_id} matchId={match.match_id} />
      ))}
    </div>
  );
};

export default Bracket;
