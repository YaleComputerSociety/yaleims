"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase"; // Your Firebase config
import { toCollegeName } from "@src/utils/helpers";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Error from "next/error";

interface BracketCellProps {
  matchId: string;
  onClick?: () => void;
}

// UPDATED: Added assignable Medal styles
const getMedalTextStyle = (medal: "gold" | "silver" | null) => {
  switch (medal) {
    case "gold": 
      return "bg-gradient-to-r from-yellow-300 to-yellow-500 text-transparent bg-clip-text font-extrabold";
    case "silver":
      return "bg-gradient-to-r from-gray-300 to-gray-500 text-transparent bg-clip-text font-bold";
    default:
      return "text-black";
    }
};
// Updated: for cute emojis
const getMedalIcon = (medal: "gold" | "silver" | null) => {
  switch (medal) {
    case "gold":
      return "🥇";
    case "silver":
      return "🥈";
    default:
      return null;
  }
};



// UPDATED: Added Mapping for long names 
const shortNames: Record<string, string> = {  
  "Benjamin Franklin": "Ben Frank", 
  "Ezra Stiles": "Stiles", 
  "Jonathan Edwards": "JE", 
  "Timothy Dwight": "TD", 
  "Grace Hopper": "Hopper",
  "Pauli Murray": "Murray",
};

const formatCollegeName = (name: string): string =>
  shortNames[name] || name;

// UPDATED: Added Skeleton Bracket Cell because the skeleton in CollegeSummaryCard was rendering strange. 
const SkeletonBracketCell = () => (
  /* Top Section */
  <div className="relative bg-white rounded-3xl shadow-lg w-64 aspect-[288/155] flex flex-col justify-between p-4 text-black">
    <div className="absolute top-1/2 left-0 w-full h-[3px] bg-gray-300 transform -translate-y-1/2 z-20" />
    <div className="flex items-center justify-between z-10">
      <div className="flex items-center space-x-2">
        <Skeleton circle height={24} width={24} baseColor="#f3f4f6" highlightColor="#e5e7eb" />
        <div className="flex items-center space-x-1">
          <Skeleton height={20} width={100} baseColor="#f3f4f6" highlightColor="#e5e7eb" />
          <Skeleton height={20} width={28} baseColor="#f3f4f6" highlightColor="#e5e7eb" />
        </div>
      </div>
      <Skeleton height={32} width={48} borderRadius={12} baseColor="#f3f4f6" highlightColor="#e5e7eb" />
    </div>
    
    <div className="flex items-center justify-between z-10">
      <div className="flex items-center space-x-2">
        <Skeleton circle height={24} width={24} baseColor="#f3f4f6" highlightColor="#e5e7eb" />
        <div className="flex items-center space-x-1">
          <Skeleton height={20} width={100} baseColor="#f3f4f6" highlightColor="#e5e7eb" />
          <Skeleton height={20} width={28} baseColor="#f3f4f6" highlightColor="#e5e7eb" />
        </div>
      </div>
      <Skeleton height={32} width={48} borderRadius={12} baseColor="#f3f4f6" highlightColor="#e5e7eb" />
    </div>
  </div>
);

// UPDATED: Created errorbracketcell to handle cell generation for !match and error. 
const ErrorBracketCell = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <div className="relative bg-white rounded-3xl shadow-lg w-64 aspect-[288/155] border-2 border-red-400 flex items-center justify-center text-red-800">
    {/* Centered stacked messages */}
    <div className="z-20 flex flex-col items-center justify-center space-y-2">
      <div className="bg-red-100 text-red-700 font-semibold text-center px-4 py-2 rounded-full">
        {title}
      </div>
      <div className="bg-red-100 text-red-700 text-sm font-medium text-center px-4 py-2 rounded-full">
        {message}
      </div>
    </div>
  </div>
);




const BracketCell: React.FC<BracketCellProps> = ({ matchId, onClick }) => {
  const [match, setMatch] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setLoading(true);
        setError(null);
        const matchDocRef = doc(db, "matches_testing", matchId);
        const matchDoc = await getDoc(matchDocRef);

        if (!matchDoc.exists()) {
          setError(`Match ${matchId} not found.`);
          setMatch(null);
        } else {
          setMatch(matchDoc.data());
        }
      } catch (err) {
        console.error(`Error fetching match ${matchId}:`, err);
        setError("Failed to load match.");
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  // UPDATED: styled Loading state
  if (loading) {
  return <SkeletonBracketCell />;
  }

  // UPDATED: styled error && !message states that use the ErrorBracketCell
  if (error) {
    return ( 
    <ErrorBracketCell 
      title="🚫 Error"
      message="Failed to load match."
    />
  );
  }

  if (!match) {
    return (
    <ErrorBracketCell 
     title="🔎 Match not Found"
     message={`Match ${matchId} not found.`} 
    />
    );
  }

  // variables from match data
  const awayCollegeName =
    match.away_college !== "TBD" ? toCollegeName[match.away_college] : "TBD";
  const homeCollegeName =
    match.home_college !== "TBD" ? toCollegeName[match.home_college] : "TBD";
  const matchScored = match.winner !== "" ? true : false;
  const isBye = match.type === "Bye" ? true : false;

  // will be 'away', 'home' or null
  const winningTeam = matchScored
    ? match.winner === match.away_college
      ? "away"
      : "home"
    : null; 


  // UPDATED: for medal rendering :)
  let topMedal: "gold" | "silver" | null = null;
  let bottomMedal: "gold" | "silver" | null = null;

  if (match.type === "Final" && matchScored) {
    if (winningTeam === "away") {
      topMedal = "gold";
      bottomMedal = "silver";
    } else if (winningTeam === "home") {
      topMedal = "silver";
      bottomMedal = "gold";
    }
  }

  // TODO: update to include additional colors for medal matches
  // if match.type == "Final" give the winner the gold color and the loser the silver color
  // can also make this more advanced later but we don't have support for a third place match right now

  // TODO: think about if/how we might want to include info about the division?
  // each match in a playoff bracket is either in blue or green division; this determines which side of the bracket they are on
  // i.e. see this link: https://docs.google.com/spreadsheets/d/ 1nRupYEAwzXtmp3t1Dnu_HjhDQDVJv-ILGwW6sO-z9w0/edit?pli=1&gid=1668930486#gid=1668930486

  return (
    <div className="relative bg-white rounded-3xl shadow-lg w-64 aspect-[288/155] flex flex-col justify-between p-4 text-black">
      <div className="absolute top-1/2 left-0 w-full h-[3px] bg-gray-300 transform -translate-y-1/2 z-20" />

      {/* Top team */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          {/* only show image if college not TBD */}
          {awayCollegeName !== "TBD" && (
            <img
              src={`/college_flags/${awayCollegeName}.png`}
              alt={awayCollegeName}
              className="w-6 h-6"
            />
          )}
          <div className="flex items-center space-x-1">
          <span className={`font-semibold text-lg break-words max-w-[120px] leading-tight text-left flex items-center space-x-1 ${getMedalTextStyle(topMedal)}`} title={awayCollegeName}>
          <span>{getMedalIcon(topMedal)}</span>
          <span>{formatCollegeName(awayCollegeName)}</span>
          </span>

            <div
              className={`bg-gray-100 text-base rounded-full px-2 py-[6px] w-[28px] h-[32px] flex items-center justify-center font-bold self-start`}
              style={{ position: "relative", top: "-8px" }}
            >
              {match.away_seed == -1 ? "" : match.away_seed}
            </div>
          </div>
        </div>

        {/* Inline BYE or nothing */}
        {isBye && (
          <div className="bg-gray-100 text-black rounded-2xl px-4 py-2 font-semibold">
            BYE
          </div>
        )}
      </div>

      {/* Bottom team, hidden if BYE */}
      {!isBye && (
        <>
          {/* Score section */}
          <div className="absolute top-1/2 right-4 flex flex-col items-center space-y-2 z-10 transform -translate-y-1/2">
            <div className="bg-gray-100 rounded-3xl px-3 py-3 flex flex-col justify-center items-center w-16 h-31 text-2xl font-extrabold space-y-5">
              <span
                className={
                  winningTeam === "away" ? "text-black" : "text-gray-400"
                }
              >
                {matchScored ? match.away_college_score : "?"}
              </span>
              <span
                className={
                  winningTeam === "home" ? "text-black" : "text-gray-400"
                }
              >
                {matchScored ? match.home_college_score : "?"}
              </span>
            </div>
          </div>

          {/* Bottom team name/seed */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center space-x-2">
              {/* only show image if college not TBD */}
              {homeCollegeName !== "TBD" && (
                <img
                  src={`/college_flags/${homeCollegeName}.png`}
                  alt={homeCollegeName}
                  className="w-6 h-6"
                />
              )}
              <div className="flex items-center space-x-1">
              <span className={`font-semibold text-lg break-words max-w-[120px] leading-tight text-left flex items-center space-x-1 ${getMedalTextStyle(bottomMedal)}`}title={homeCollegeName}>
              <span>{getMedalIcon(bottomMedal)}</span>
              <span>{formatCollegeName(homeCollegeName)}</span>
              </span>

                <span
                  className={`bg-gray-100 text-base rounded-full px-2 py-[6px] w-[28px] h-[32px] flex items-center justify-center font-bold self-start`}
                  style={{ position: "relative", top: "-8px" }}
                >
                  {match.home_seed == -1 ? "" : match.home_seed}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BracketCell;

// export type TeamIdentifier =
//   | "gold"
//   | "silver"
//   | "bronze"
//   | "4th"
//   | "bye"
//   | undefined; // add forfeit

// export interface TeamData {
//   college: string;
//   score: number;
//   seed: number;
//   logo: string;
//   identifier?: TeamIdentifier;
// }

// interface BracketCellProps {
//   topTeam: TeamData;
//   bottomTeam: TeamData | null;
// }

// const BracketCell: React.FC<BracketCellProps> = ({ topTeam, bottomTeam }) => {
//   const isBye = topTeam.identifier === "bye";
//   const isTopWinner = !!(bottomTeam && topTeam.score > bottomTeam.score);
//   const isBottomWinner = !!(bottomTeam && bottomTeam.score > topTeam.score);

//   const getMedalTextStyle = (identifier?: TeamIdentifier) => {
//     switch (identifier) {
//       case "gold":
//         return "bg-clip-text text-transparent bg-gradient-to-r from-[#E39800] to-[#FFEA00]";
//       case "silver":
//         return "bg-clip-text text-transparent bg-gradient-to-r from-[#454545] to-[#fcfcfc]";
//       case "bronze":
//         return "bg-clip-text text-transparent bg-gradient-to-r from-[#804009] to-[#f0b12a]";
//       case "4th":
//         return "text-gray-400";
//       default:
//         return "";
//     }
//   };

//   const getTextColor = (isWinner: boolean, identifier?: TeamIdentifier) => {
//     if (identifier === "4th") return "text-gray-400";
//     return isWinner ? "text-black" : "text-gray-400";
//   };

// return (
//   <div className="relative bg-white rounded-3xl shadow-lg w-64 aspect-[288/155] flex flex-col justify-between p-4 text-black">
//     <div className="absolute top-1/2 left-0 w-full h-[3px] bg-gray-300 transform -translate-y-1/2 z-20" />

//     {/* Top team */}
//     <div className="flex items-center justify-between z-10">
//       <div className="flex items-center space-x-2">
//         <img
//           src={`/college_flags/${topTeam.college}.png`}
//           alt={topTeam.college}
//           className="w-6 h-6"
//         />
//         <div className="flex items-center space-x-1">
//           <span
//             className={`${getMedalTextStyle(
//               topTeam.identifier
//             )} ${getTextColor(
//               isTopWinner,
//               topTeam.identifier
//             )} font-semibold text-lg`}
//           >
//             {topTeam.college}
//           </span>
//           <div
//             className={`bg-gray-100 text-base rounded-full px-2 py-[6px] w-[28px] h-[32px] flex items-center justify-center font-bold self-start ${getTextColor(
//               isTopWinner,
//               topTeam.identifier
//             )}`}
//             style={{ position: "relative", top: "-8px" }}
//           >
//             {topTeam.seed}
//           </div>
//         </div>
//       </div>

//       {/* Inline BYE or nothing */}
//       {isBye && (
//         <div className="bg-gray-100 text-black rounded-2xl px-4 py-2 font-semibold">
//           BYE
//         </div>
//       )}
//     </div>

//     {/* Bottom team, hidden if BYE */}
//     {!isBye && bottomTeam && (
//       <>
//         {/* Score section */}
//         <div className="absolute top-1/2 right-4 flex flex-col items-center space-y-2 z-10 transform -translate-y-1/2">
//           <div className="bg-gray-100 rounded-3xl px-3 py-3 flex flex-col justify-center items-center w-16 h-31 text-2xl font-extrabold space-y-5">
//             <span className={isTopWinner ? "text-black" : "text-gray-400"}>
//               {topTeam.score}
//             </span>
//             <span className={isBottomWinner ? "text-black" : "text-gray-400"}>
//               {bottomTeam.score}
//             </span>
//           </div>
//         </div>

//         {/* Bottom team name/seed */}
//         <div className="flex items-center justify-between z-10">
//           <div className="flex items-center space-x-2">
//             <img
//               src={`/college_flags/${bottomTeam.college}.png`}
//               alt={bottomTeam.college}
//               className="w-6 h-6"
//             />
//             <div className="flex items-center space-x-1">
//               <span
//                 className={`${getMedalTextStyle(
//                   bottomTeam.identifier
//                 )} ${getTextColor(
//                   isBottomWinner,
//                   bottomTeam.identifier
//                 )} font-semibold text-lg`}
//               >
//                 {bottomTeam.college}
//               </span>
//               <span
//                 className={`bg-gray-100 text-base rounded-full px-2 py-[6px] w-[28px] h-[32px] flex items-center justify-center font-bold self-start ${getTextColor(
//                   isBottomWinner,
//                   bottomTeam.identifier
//                 )}`}
//                 style={{ position: "relative", top: "-8px" }}
//               >
//                 {bottomTeam.seed}
//               </span>
//             </div>
//           </div>
//         </div>
//       </>
//     )}
//   </div>
//   );
// };

// export default BracketCell;
