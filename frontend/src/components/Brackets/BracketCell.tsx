"use client";


import React from "react";


export type TeamIdentifier = "gold" | "silver" | "bronze" | "4th" | "bye" | undefined; // add forfeit


export interface TeamData {
 college: string;
 score: number;
 seed: number;
 logo: string;
 identifier?: TeamIdentifier;
}


interface BracketCellProps {
 topTeam: TeamData;
 bottomTeam: TeamData | null;
}


const BracketCell: React.FC<BracketCellProps> = ({ topTeam, bottomTeam }) => {
 const isBye = topTeam.identifier === "bye";
 const isTopWinner = !!(bottomTeam && topTeam.score > bottomTeam.score);
 const isBottomWinner = !!(bottomTeam && bottomTeam.score > topTeam.score);


 const getMedalTextStyle = (identifier?: TeamIdentifier) => {
   switch (identifier) {
     case "gold":
       return "bg-clip-text text-transparent bg-gradient-to-r from-[#E39800] to-[#FFEA00]";
     case "silver":
       return "bg-clip-text text-transparent bg-gradient-to-r from-[#454545] to-[#fcfcfc]";
     case "bronze":
       return "bg-clip-text text-transparent bg-gradient-to-r from-[#804009] to-[#f0b12a]";
     case "4th":
       return "text-gray-400";
     default:
       return "";
   }
 };


 const getTextColor = (isWinner: boolean, identifier?: TeamIdentifier) => {
   if (identifier === "4th") return "text-gray-400";
   return isWinner ? "text-black" : "text-gray-400";
 };


 return (
   <div className="relative bg-white rounded-3xl shadow-lg w-64 aspect-[288/155] flex flex-col justify-between p-4 text-black">
     <div className="absolute top-1/2 left-0 w-full h-[3px] bg-gray-300 transform -translate-y-1/2 z-20" />


     {/* Top team */}
     <div className="flex items-center justify-between z-10">
       <div className="flex items-center space-x-2">
         <img src={`/college_flags/${topTeam.college}.png`} alt={topTeam.college} className="w-6 h-6" />
         <div className="flex items-center space-x-1">
           <span
             className={`${getMedalTextStyle(topTeam.identifier)} ${getTextColor(isTopWinner, topTeam.identifier)} font-semibold text-lg`}
           >
             {topTeam.college}
           </span>
           <div
             className={`bg-gray-100 text-base rounded-full px-2 py-[6px] w-[28px] h-[32px] flex items-center justify-center font-bold self-start ${getTextColor(isTopWinner, topTeam.identifier)}`}
             style={{ position: "relative", top: "-8px" }}
           >
             {topTeam.seed}
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
     {!isBye && bottomTeam && (
       <>
         {/* Score section */}
         <div className="absolute top-1/2 right-4 flex flex-col items-center space-y-2 z-10 transform -translate-y-1/2">
           <div className="bg-gray-100 rounded-3xl px-3 py-3 flex flex-col justify-center items-center w-16 h-31 text-2xl font-extrabold space-y-5">
             <span className={isTopWinner ? "text-black" : "text-gray-400"}>
               {topTeam.score}
             </span>
             <span className={isBottomWinner ? "text-black" : "text-gray-400"}>
               {bottomTeam.score}
             </span>
           </div>
         </div>


         {/* Bottom team name/seed */}
         <div className="flex items-center justify-between z-10">
           <div className="flex items-center space-x-2">
             <img
               src={`/college_flags/${bottomTeam.college}.png`}
               alt={bottomTeam.college}
               className="w-6 h-6"
             />
             <div className="flex items-center space-x-1">
               <span
                 className={`${getMedalTextStyle(bottomTeam.identifier)} ${getTextColor(isBottomWinner, bottomTeam.identifier)} font-semibold text-lg`}
               >
                 {bottomTeam.college}
               </span>
               <span
                 className={`bg-gray-100 text-base rounded-full px-2 py-[6px] w-[28px] h-[32px] flex items-center justify-center font-bold self-start ${getTextColor(isBottomWinner, bottomTeam.identifier)}`}
                 style={{ position: "relative", top: "-8px" }}
               >
                 {bottomTeam.seed}
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



