"use client";

import React from "react";
import BracketCell, { TeamData } from "@src/components/Brackets/BracketCell";
import { Match } from "@src/types/components";
import { Ubuntu } from "next/font/google";

// test

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "700"],
});


const collegeMeta: Record<string, { seed: number; logo: string }> = {
  Morse: { seed: 1, logo: "/logos/morse.png" },
  Trumbull: { seed: 6, logo: "/logos/trumbull.png" },
};

function mapMatchToTeams(match: Match) {
  const isBye = match.away_college.toLowerCase() === "bye";

  const home: TeamData = {
    college: match.home_college,
    score: match.home_college_score,
    seed: collegeMeta[match.home_college]?.seed ?? 0,
    logo:
      collegeMeta[match.home_college]?.logo ?? "/college_flags/Trumbull.png", // Ask Kaitlyn about how to import fflags
    identifier: undefined,
  };

  if (isBye) {
    return {
      topTeam: { ...home, identifier: "bye" },
      bottomTeam: null,
    };
  }

  const away: TeamData = {
    college: match.away_college,
    score: match.away_college_score,
    seed: collegeMeta[match.away_college]?.seed ?? 0,
    logo: collegeMeta[match.away_college]?.logo ?? "/logos/default.png", // ask Kaitlyn
    identifier: undefined,
  };

  const winner = match.winner;
  // not modular yet

  /* Gold and Silver Effects on Final Round */
  if (match.type === "Final") {
    if (winner === home.college) {
      home.identifier = "gold";
      away.identifier = "silver";
    } else if (winner === away.college) {
      home.identifier = "silver";
      away.identifier = "gold";
    }
  }

  /* Bronze effect for winning team in Bronze medal match */ // not sure what to call or if we have something in the database for this yet
  if (match.type === "BronzeFinal") {
    if (winner === home.college) {
      home.identifier = "bronze";
      away.identifier = "4th";
    } else if (winner === away.college) {
      home.identifier = "4th";
      away.identifier = "bronze";
    }
  }
  // only assign bronze if bracket

  return home.seed < away.seed
    ? { topTeam: home, bottomTeam: away }
    : { topTeam: away, bottomTeam: home };
}

const BracketsPage: React.FC = () => {
//   const { topTeam, bottomTeam } = mapMatchToTeams(match);

  // return (
  //   <div className={ubuntu.className}>
  //     <div className="p-6 space-y-4">
  //       <h1 className="text-2xl font-bold">Brackets</h1>
  //       <BracketCell topTeam={topTeam} bottomTeam={bottomTeam} />
  //     </div>
  //   </div>
  // );

  return (
    <div className={ubuntu.className}>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Brackets</h1>
        <BracketCell matchId={"playoff-15"} />
      </div>
    </div>
  );
};

export default BracketsPage;
