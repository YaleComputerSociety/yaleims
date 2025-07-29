// "use client";

// import React, { useState, useEffect } from "react";
// import Bracket from "@src/components/Brackets/Bracket";
// import { currentYear, sports } from "@src/utils/helpers";
// import { doc, getDoc } from "firebase/firestore";
// import { db } from "../../../lib/firebase";
// import { Ubuntu } from "next/font/google";
// import { useSeason } from "@src/context/SeasonContext";
// import LoadingSpinner from "@src/components/LoadingSpinner";
// import LoadingScreen from "@src/components/LoadingScreen";

// interface FirestoreMatch {
//   bracket_placement: number;
//   match_id: string;
//   round: string;
// }

// const BracketsPage: React.FC = () => {
// const { currentSeason, pastSeasons, seasonLoading } = useSeason();
// const pastYears = pastSeasons?.years || [];

// const [sport, setSport] = useState<string>("");
// const [loading, setLoading] = useState<boolean>(false);
// const [error, setError] = useState<string | null>(null);
// const [bracket, setBracket] = useState<FirestoreMatch[] | null>(null); // update type with a bracket type
// const [season, setSeason] = useState<string>(
//   currentSeason?.year || currentYear
// );

// const handleSportChange = (sport: string) => {
//   setSport(sport);
// };

// const handleSeasonChange = (season: string) => {
//   setSeason(season);
// };

// useEffect(() => {
//   const fetchBracket = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       const bracketDocRef = doc(db, "brackets", "seasons", season, sport);
//       const bracketDoc = await getDoc(bracketDocRef);

//       if (!bracketDoc.exists()) {
//         setError(`Bracket for ${sport} (${season}) not found`);
//         setBracket(null);
//       } else {
//         setBracket(bracketDoc.data().matches);
//       }
//     } catch (err) {
//       console.error(`Error fetching bracket for ${sport} (${season}):`, err);
//       setError(`Bracket doesn't yet exist!`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (sport && season) {
//     fetchBracket();
//   }
// }, [sport, season]);

//   // TODO: fix loading and error displays

//   // SMALL BUG: "Brackets" header slightly shifts when a new sport is selected?
//   // may need to just redo the formatting of the header, may not be ideal

// if (seasonLoading) {
//   return <LoadingScreen />;
// }

//   return (
//     <div className="p-6 min-h-screen">
//       {/* header */}
//       <div className="relative flex items-center w-full my-10">
//         {/* sport dropdown left */}
//         <div className="absolute left-0 flex gap-2">
//           <select
//             className="p-2 border border-gray-300 rounded"
//             value={sport}
//             onChange={(e) => handleSportChange(e.target.value)}
//           >
//             <option value="">Select Sport</option>
//             {sports.map((sport) => (
//               <option key={sport.name} value={sport.name}>
//                 {sport.emoji} {sport.name}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* title */}
//         <h1 className="text-2xl sm:text-4xl font-bold w-full text-center">
//           Brackets
//         </h1>

//         {/* year dropdown right */}
// <div className="absolute right-0 flex gap-2">
//   <select
//     className="p-2 border border-gray-300 rounded"
//     value={season}
//     onChange={(e) => handleSeasonChange(e.target.value)}
//   >
//     <option value={currentSeason?.year || currentYear}>
//       {currentSeason?.year || currentYear}
//     </option>
//     {pastYears
//       .filter((y: string) => y !== (currentSeason?.year || currentYear))
//       .map((y: string) => (
//         <option key={y} value={y}>
//           {y}
//         </option>
//       ))}
//   </select>
// </div>

//         {/* loading and error states */}
//         {loading && <LoadingSpinner />}
//         {error && <p>no bracket yet!</p>}
//       </div>
//       {bracket ? <Bracket matches={bracket} /> : <p>No bracket</p>}
//     </div>
//   );
// };

// export default BracketsPage;

"use client";

import React, { useState, useEffect } from "react";
import Bracket from "@src/components/Brackets/Bracket";
import { currentYear, sports } from "@src/utils/helpers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

// import  TeamData from "@src/components/Brackets/BracketCell";
import BracketCell from "@src/components/Brackets/BracketCell";
// import { Match } from "@src/types/components";
import { Ubuntu } from "next/font/google";
import { useSeason } from "@src/context/SeasonContext";
import LoadingScreen from "@src/components/LoadingScreen";

// const ubuntu = Ubuntu({
//   subsets: ["latin"],
//   weight: ["400", "700"],
// });

interface FirestoreMatch {
  bracket_placement: number;
  match_id: string;
  round: string;
}

const BracketsPage: React.FC = () => {
  const { currentSeason, pastSeasons, seasonLoading } = useSeason();
  const pastYears = pastSeasons?.years || [];

  const [sport, setSport] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bracket, setBracket] = useState<FirestoreMatch[] | null>(null); // update type with a bracket type
  const [season, setSeason] = useState<string>(
    currentSeason?.year || currentYear
  );

  const handleSeasonChange = (season: string) => {
    setSeason(season);
  };

  const handleSportChange = (sport: string) => {
    setSport(sport);
  };

  useEffect(() => {
    const fetchBracket = async () => {
      try {
        setLoading(true);
        setError(null);

        const bracketDocRef = doc(db, "brackets", "seasons", season, sport);
        const bracketDoc = await getDoc(bracketDocRef);

        if (!bracketDoc.exists()) {
          setError(`Bracket for ${sport} (${season}) not found`);
          setBracket(null);
        } else {
          setBracket(bracketDoc.data().matches);
        }
      } catch (err) {
        console.error(`Error fetching bracket for ${sport} (${season}):`, err);
        setError(`Bracket doesn't yet exist!`);
      } finally {
        setLoading(false);
      }
    };

    if (sport && season) {
      fetchBracket();
    }
  }, [sport, season]);

  if (seasonLoading) {
    return <LoadingScreen />;
  }

  // TODO: fix loading and error displays

  return (
    <div className={`min-h-screen bg-blue-100 py-10 px-8`}>
      <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-800 mb-4">
        Brackets
      </h1>

      {/* Welcome Message */}
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow px-6 py-4 text-center text-lg text-gray-700 mb-4">
        <p className="font-bold mb-2">
          Welcome to YaleIMS's newest feature — the Brackets Page!
        </p>
        <p>
          To view upcoming, past, or current playoff matches, please select your
          desired sport and year.
        </p>
      </div>

      {/* Sport Selector & Actions */}
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow px-6 py-4 flex flex-wrap justify-between items-center text-gray-700 mb-12 gap-4">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold">Sport:</span>
          <select
            className="border border-gray-300 rounded px-3 py-1"
            value={sport}
            onChange={(e) => handleSportChange(e.target.value)}
          >
            <option value="">Select Sport</option>
            {sports.map((sport) => (
              <option key={sport.name} value={sport.name}>
                {sport.emoji} {sport.name}
              </option>
            ))}
          </select>

          <span className="text-lg font-semibold ml-6">Year:</span>
          <select
            className="border border-gray-300 rounded px-3 py-1"
            value={season}
            onChange={(e) => handleSeasonChange(e.target.value)}
          >
            <option value={currentSeason?.year || currentYear}>
              {currentSeason?.year || currentYear}
            </option>
            {pastYears
              .filter((y: string) => y !== (currentSeason?.year || currentYear))
              .map((y: string) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Column Titles Row */}
      <div className="grid grid-cols-7 gap-16 max-w-7xl mx-auto mb-6">
        <div className="text-center text-lg font-semibold text-blue-700">
          Playoffs
        </div>
        <div className="text-center text-lg font-semibold text-gray-600">
          Quarterfinals
        </div>
        <div className="text-center text-lg font-semibold text-gray-600">
          Semifinals
        </div>
        <div className="text-center text-lg font-semibold text-gray-600">
          Final
        </div>
        <div className="text-center text-lg font-semibold text-gray-600">
          Semifinals
        </div>
        <div className="text-center text-lg font-semibold text-gray-600">
          Quarterfinals
        </div>
        <div className="text-center text-lg font-semibold text-gray-600">
          Playoffs
        </div>
      </div>

      {/* Bracket Columns */}
      {bracket ? (
        <div className="w-full flex justify-center overflow-x-auto">
          <div className="grid grid-cols-7 gap-16 relative items-start max-w-7xl mx-auto">
            {/* Left Playoffs */}
            <div className="flex flex-col items-end space-y-20">
              {bracket
                .filter((m) => m.round === "playoffs-left")
                .map((match) => (
                  <div className="scale-90" key={match.match_id}>
                    <BracketCell matchId={match.match_id} />
                  </div>
                ))}
            </div>

            {/* Left Quarters */}
            <div className="ml-4 flex flex-col items-end justify-center space-y-36">
              {bracket
                .filter((m) => m.round === "quarter-left")
                .map((match) => (
                  <div className="scale-90" key={match.match_id}>
                    <BracketCell matchId={match.match_id} />
                  </div>
                ))}
            </div>

            {/* Left Semis */}
            <div className="ml-6 flex flex-col items-end justify-center space-y-48">
              {bracket
                .filter((m) => m.round === "semi-left")
                .map((match) => (
                  <div className="scale-90" key={match.match_id}>
                    <BracketCell matchId={match.match_id} />
                  </div>
                ))}
            </div>

            {/* Final */}
            <div className="flex flex-col items-center justify-center space-y-6">
              <img src="/trophy.png" alt="Trophy" className="w-14 h-14" />
              <div className="scale-90">
                <BracketCell matchId="playoff-15" />
              </div>
              <div className="bg-white rounded-lg px-2 py-1 shadow text-center">
                <p className="text-base ">
                  Congrats to the 2025 Champs, [College]!
                </p>
              </div>
            </div>

            {/* Right Semis */}
            <div className="-ml-6 flex flex-col items-start justify-center space-y-48">
              {bracket
                .filter((m) => m.round === "semi-right")
                .map((match) => (
                  <div className="scale-90" key={match.match_id}>
                    <BracketCell matchId={match.match_id} />
                  </div>
                ))}
            </div>

            {/* Right Quarters */}
            <div className="-ml-4 flex flex-col items-start justify-center space-y-36">
              {bracket
                .filter((m) => m.round === "quarter-right")
                .map((match) => (
                  <div className="scale-90" key={match.match_id}>
                    <BracketCell matchId={match.match_id} />
                  </div>
                ))}
            </div>

            {/* Right Playoffs */}
            <div className="flex flex-col items-start space-y-20">
              {bracket
                .filter((m) => m.round === "playoffs-right")
                .map((match) => (
                  <div className="scale-90" key={match.match_id}>
                    <BracketCell matchId={match.match_id} />
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500 mt-10">
          No bracket loaded. Please select a sport.
        </p>
      )}
    </div>
  );
};

export default BracketsPage;

//   return (
//     <div className={ubuntu.className}>
//       <div className="p-6 min-h-screen">
//         {/* header */}
//         <div className="relative flex items-center w-full mb-6">
//           {/* dropdown menu */}
//           <div className="absolute left-0">
//             <select
//               className="p-2 border border-gray-300 rounded"
//               value={sport}
//               onChange={(e) => handleSportChange(e.target.value)}
//             >
//               <option value="">Select Sport</option>
//               {sports.map((sport) => (
//                 <option key={sport.name} value={sport.name}>
//                   {sport.emoji} {sport.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* TODO: loading state */}
//           {loading && <p>loading...</p>}

//           {/* TODO: error state */}
//           {error && <p>no bracket yet!</p>}

//           {/* title */}
//           <h1 className="text-2xl sm:text-4xl font-bold w-full text-center">
//             Brackets
//           </h1>
//         </div>
//         {bracket ? <Bracket matches={bracket} /> : <p>No bracket</p>}
// =======
//   return (
//     <div className={`${ubuntu.className} min-h-screen py-10 px-8`}>
//       <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-800 mb-16">
//         Brackets
//       </h1>

//       {/* Welcome Message */}
//       <div className="max-w-3xl mx-auto bg-white rounded-lg shadow px-6 py-4 text-center text-lg text-gray-700 mb-4">
//         <p className="font-bold mb-2">Welcome to YaleIMS's newest feature — the Brackets Page!</p>
//         <p>To view upcoming, past, or current playoff matches, please select your desired sport and year. To download or share this page, click the buttons below.</p>
//       </div>

//       {/* Placeholder for now, but I'm pretty sure we could synch this up to the database like we are doing with the bracketcells! */}
//       {/* Sport Selector */}
//       <div className="max-w-3xl mx-auto bg-white rounded-lg shadow px-6 py-4 flex flex-wrap justify-between items-center text-gray-700 mb-12 gap-4">
//   <div className="flex items-center gap-4">
//     <span className="text-lg font-semibold">Sport:</span>
//     <select className="border border-gray-300 rounded px-3 py-1">
//       <option>Volleyball</option>
//       <option>Basketball</option>
//       <option>Soccer</option>
//     </select>

//     <span className="text-lg font-semibold ml-6">Year:</span>
//     <select className="border border-gray-300 rounded px-3 py-1">
//       <option>2025</option>
//       <option>2024</option>
//       <option>2023</option>
//     </select>
//   </div>

//   <div className="flex items-center gap-3 ml-auto">
//     <button
//       className="bg-gray-200 hover:bg-gray-300 text-sm font-semibold text-gray-800 rounded px-4 py-2 shadow"
//       onClick={() => window.print()}
//     >
//       Download
//     </button>
//     <button
//       className="bg-blue-500 hover:bg-blue-600 text-sm font-semibold text-white rounded px-4 py-2 shadow"
//       onClick={() => {
//         navigator.share
//           ? navigator.share({
//               title: "YaleIMS Bracket",
//               url: window.location.href,
//             })
//           : alert("Sharing is not supported on this device.");
//       }}
//     >
//       Share
//     </button>
//   </div>
// </div>

//       {/* Column Titles Row */}
//       <div className="grid grid-cols-7 gap-16 max-w-7xl mx-auto mb-6">
//         <div className="text-center text-lg text-blue-700">Playoffs</div>
//         <div className="text-center text-lg text-blue-700">Quarterfinals</div>
//         <div className="text-center text-lg text-blue-700">Semifinals</div>
//         <div className="text-center text-lg font-semibold text-blue-700">Final</div>
//         <div className="text-center text-lg text-blue-700">Semifinals</div>
//         <div className="text-center text-lg text-blue-700">Quarterfinals</div>
//         <div className="text-center text-lg text-blue-700">Playoffs</div>
//       </div>

//       {/* Bracket Columns */}
//       <div className="w-full flex justify-center overflow-x-auto">
//         <div className="grid grid-cols-7 gap-16 relative items-start max-w-7xl mx-auto">

//           {/* Left Playoffs */}
//           <div className="flex flex-col items-end space-y-20">
//             {["playoff-1", "playoff-2", "playoff-3", "playoff-4"].map((id) => (
//               <div className="scale-75" key={id}>
//                 <BracketCell matchId={id} />
//               </div>
//             ))}
//           </div>

//           {/* Left Quarters */}
//           <div className="ml-4 flex flex-col items-end justify-center space-y-72">
//             {["playoff-5", "playoff-6"].map((id) => (
//               <div className="scale-75 mt-32" key={id}>
//                 <BracketCell matchId={id} />
//               </div>
//             ))}
//           </div>

//           {/* Left Semis */}
//           <div className="ml-4 flex flex-col items-end justify-center space-y-48">
//             <div className="scale-75 mt-64 self-end -pl-24">
//               <BracketCell matchId="playoff-13" />
//             </div>
//           </div>

//           {/* Final */}
//           {/* We could add in some conditional logic here for the trophy and congrats message visibility! */}
//           <div className="flex flex-col items-center justify-center space-y-6">
//             <img src="/trophy.png" alt="Trophy" className="w-14 h-14" />
//             <div className="scale-75">
//               <BracketCell matchId="playoff-15" />
//             </div>
//             <div className="bg-white rounded-lg leading-tight px-3 py-1">
//               <p className="text-base ">Congrats to our champs, [College]!</p>
//               {/* <img src="/logos/yms-shield.png" alt="Shield" className="w-10 h-10 mx-auto mt-2" /> */}
//             </div>
//           </div>

//           {/* Right Semis */}
//           <div className="-ml-6 flex flex-col items-start justify-center space-y-48">
//             <div className="scale-75 -ml-6 mt-64">
//               <BracketCell matchId="playoff-14" />
//             </div>
//           </div>

//           {/* Right Quarters */}
//           <div className="-ml-4 flex flex-col items-start justify-center space-y-72">
//             {["playoff-11", "playoff-12"].map((id) => (
//               <div className="scale-75 -ml-2 mt-32" key={id}>
//                 <BracketCell matchId={id} />
//               </div>
//             ))}
//           </div>

//           {/* Right Playoffs */}
//           <div className="flex flex-col items-start space-y-20">
//             {["playoff-7", "playoff-8", "playoff-9", "playoff-10"].map((id) => (
//               <div className="scale-75" key={id}>
//                 <BracketCell matchId={id} />
//               </div>
//             ))}
//           </div>

//         </div>
