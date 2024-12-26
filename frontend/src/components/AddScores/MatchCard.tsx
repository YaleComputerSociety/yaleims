"use client";

import React, { useState } from "react";
import { MatchCardProps } from "@src/types/components";
import { emojiMap, toCollegeName } from "@src/data/helpers";
import Image from "next/image";

const MatchCard: React.FC<MatchCardProps> = ({ match, setLoading }) => {
  const [awayScore, setAwayScore] = useState<string>("");
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayForfeit, setAwayForfeit] = useState<boolean>(false);
  const [homeForfeit, setHomeForfeit] = useState<boolean>(false);

  // confused about forfeit logic but implemented as in figma

  const handleAwayCheckboxChange = () => {
    setAwayForfeit(!awayForfeit);

    if (awayForfeit) {
      setAwayScore("");
    } else {
      setAwayScore("0");
    }
  };

  const handleHomeCheckboxChange = () => {
    setHomeForfeit(!homeForfeit);

    if (homeForfeit) {
      setHomeScore("");
    } else {
      setHomeScore("0");
    }
  };

  const handleHomeScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Only set the value if it's empty or a valid number
    if (inputValue === "" || /^[0-9]+$/.test(inputValue)) {
      setHomeScore(inputValue);
    }
  };

  const handleAwayScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === "" || /^[0-9]+$/.test(inputValue)) {
      setAwayScore(inputValue);
    }
  };

  const handleSubmit = async () => {
    console.log("submitting scores");
    setLoading(true);

    try {
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/scoreMatch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId: match.id,
            homeScore: homeScore === "" ? null : parseInt(homeScore),
            awayScore: awayScore === "" ? null : parseInt(awayScore),
            homeForfeit: homeForfeit,
            awayForfeit: awayForfeit,
            homeTeam: match.home_college,
            awayTeam: match.away_college,
            sport: match.sport,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }
      console.log("successfully submitted score");
    } catch (error) {
      console.error("Failed to submit score:", error);
    } finally {
      setLoading(false);
      window.location.reload(); // to refresh page and show updated list of matches; is there a better way to do this?
    }
  };

  const timestamp = match.timestamp;

  const date = new Date(
    timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000
  );

  const formattedTime = date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const formattedDate = date.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });

  // need to make mobile compatible
  return (
    <div className="w-full">
      {/* Header Row */}
      <div className="grid grid-cols-6 items-center text-sm font-semibold text-black mb-2 px-8">
        <div className="col-span-3">{formattedDate}</div>{" "}
        {/* add string like, "Today", etc. */}
        <div className="text-center">Forfeit?</div>
        <div className="text-center">Score</div>
        <div></div> {/* Empty for spacing */}
      </div>
      {/* Match Card */}
      <div className="grid grid-cols-6 bg-white justify-between items-center py-4 px-8">
        <p>{formattedTime}</p>
        <p>{emojiMap[match.sport]}</p>
        <div className="flex flex-col justify-between items-start gap-4">
          <div className="flex items-center">
            <Image
              src={`/college_flags/${toCollegeName[match.away_college]}.png`}
              alt={match.away_college}
              width={20}
              height={20}
              className="mr-2 object-contain"
              unoptimized
            />
            <p>{toCollegeName[match.away_college]}</p>
          </div>
          <div className="flex items-center">
            <Image
              src={`/college_flags/${toCollegeName[match.home_college]}.png`}
              alt={match.home_college}
              width={20}
              height={20}
              className="mr-2 object-contain"
              unoptimized
            />
            <p>{toCollegeName[match.home_college]}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          {/* want to make the checked box have a checkmark in it */}
          <input
            type="checkbox"
            className="appearance-none disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200 checked:bg-blue-600 checked:border-transparent hover:cursor-pointer w-10 h-8 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            checked={awayForfeit}
            onChange={handleAwayCheckboxChange}
          />
          <input
            type="checkbox"
            className="appearance-none disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200 checked:bg-blue-600 checked:border-transparent hover:cursor-pointer w-10 h-8 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            checked={homeForfeit}
            onChange={handleHomeCheckboxChange}
          />
        </div>
        <div className="flex flex-col items-center gap-4">
          <input
            type="text"
            className="w-10 h-8 text-center border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200"
            value={awayScore}
            onChange={(e) => handleAwayScoreChange(e)}
            disabled={awayForfeit}
          />
          <input
            type="text"
            className="w-10 h-8 text-center border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200"
            value={homeScore}
            onChange={(e) => handleHomeScoreChange(e)}
            disabled={homeForfeit}
          />
        </div>
        <button
          className="bg-blue-500 text-center py-5 rounded-lg text-white text-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={
            // !awayForfeit && (confused about the forfeit logic)
            // !homeForfeit &&
            awayScore === "" || homeScore === ""
          }
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default MatchCard;

// {/* <div>
// <div className="flex flex-row px-8">Date</div> {/* figure out parsing */}
// <div className="flex flex-row bg-white justify-between items-center py-4 px-8">
//   <p>Time</p> {/* figure out parsing */}
//   <p>{emojiMap[match.sport]}</p>
//   <div className="flex flex-col justify-between items-start gap-4">
//     <div className="flex items-center">
//       <Image
//         src={`/college_flags/${toCollegeName[match.away_college]}.png`}
//         alt={match.away_college}
//         width={20}
//         height={20}
//         className="mr-2 object-contain"
//         unoptimized
//       />
//       <p>{toCollegeName[match.away_college]}</p>
//     </div>
//     <div className="flex items-center">
//       <Image
//         src={`/college_flags/${toCollegeName[match.home_college]}.png`}
//         alt={match.home_college}
//         width={20}
//         height={20}
//         className="mr-2 object-contain"
//         unoptimized
//       />
//       <p>{toCollegeName[match.home_college]}</p>
//     </div>
//   </div>
//   <div className="flex flex-col items-center gap-4">
//     {/* want to make the checked box have a checkmark in it */}
//     <input
//       type="checkbox"
//       className="appearance-none disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200 checked:bg-blue-600 checked:border-transparent hover:cursor-pointer w-10 h-8 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
//       checked={awayForfeit}
//       onChange={handleAwayCheckboxChange}
//       disabled={homeForfeit}
//     />
//     <input
//       type="checkbox"
//       className="appearance-none disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200 checked:bg-blue-600 checked:border-transparent hover:cursor-pointer w-10 h-8 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
//       checked={homeForfeit}
//       onChange={handleHomeCheckboxChange}
//       disabled={awayForfeit}
//     />
//   </div>
//   <div className="flex flex-col items-center gap-4">
//     <input
//       type="text"
//       className="w-10 h-8 text-center border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200"
//       value={awayScore}
//       onChange={(e) => handleAwayScoreChange(e)}
//       disabled={awayForfeit || homeForfeit}
//     />
//     <input
//       type="text"
//       className="w-10 h-8 text-center border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200"
//       value={homeScore}
//       onChange={(e) => handleHomeScoreChange(e)}
//       disabled={homeForfeit || awayForfeit}
//     />
//   </div>
//   <button
//     className="bg-blue-500 py-5 px-10 rounded-lg text-white text-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
//     disabled={
//       !awayForfeit &&
//       !homeForfeit &&
//       (awayScore === "" || homeScore === "")
//     }
//     onClick={handleSubmit}
//   >
//     Submit
//   </button>
// </div>
// </div> */}
