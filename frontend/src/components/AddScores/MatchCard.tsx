"use client";

import React, { useState } from "react";
import { MatchCardProps } from "@src/types/components";
import { emojiMap, toCollegeName } from "@src/utils/helpers";
import Image from "next/image";

const MatchCard: React.FC<MatchCardProps> = ({ match, setLoading }) => {
  const [awayScore, setAwayScore] = useState<string>("");
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayForfeit, setAwayForfeit] = useState<boolean>(false);
  const [homeForfeit, setHomeForfeit] = useState<boolean>(false);

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
    } catch (error) {
      console.error("Failed to submit score:", error);
    } finally {
      setLoading(false);
      window.location.reload(); // to refresh page and show updated list of matches
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

  return (
    <div className="w-full text-xs md:text-sm mb-4">
      {/* Header Row */}
      <div className="grid md:grid-cols-5 grid-cols-4 items-center font-semibold text-black dark:text-white mb-2 px-2 md:px-8">
        <div className="col-span-2">{formattedDate}</div>{" "}
        <div className="text-center">Forfeit?</div>
        <div className="text-center">Score</div>
        <div></div> {/* Empty for spacing */}
      </div>

      {/* Match Card */}
      <div className="grid md:grid-cols-5 grid-cols-4 bg-white  dark:bg-black justify-between items-center py-4 px-2 md:px-8">
        <div className="flex flex-col md:flex-row items-center pr-1 lg:pr-8 h-full py-1 justify-between md:justify-around">
          <p>{formattedTime}</p>
          <p>{emojiMap[match.sport]}</p>
        </div>
        <div className="flex flex-col justify-between items-start gap-4 sm:pl-4 xl:pl-16 lg:pl-10">
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
        <div className="flex flex-col items-center gap-4 h-full justify-between">
          <input
            type="checkbox"
            className="appearance-none disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200 checked:bg-blue-600 checked:border-transparent hover:cursor-pointer w-5 h-5 md:w-10 md:h-8 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            checked={awayForfeit}
            onChange={handleAwayCheckboxChange}
          />
          <input
            type="checkbox"
            className="appearance-none disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200 checked:bg-blue-600 checked:border-transparent hover:cursor-pointer w-5 h-5 md:w-10 md:h-8 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            checked={homeForfeit}
            onChange={handleHomeCheckboxChange}
          />
        </div>
        <div className="flex flex-col items-center gap-4 h-full justify-between">
          <input
            type="text"
            className="w-5 h-5 md:w-10 md:h-8 text-center border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200"
            value={awayScore}
            onChange={(e) => handleAwayScoreChange(e)}
            disabled={awayForfeit}
          />
          <input
            type="text"
            className="w-5 h-5 md:w-10 md:h-8 text-center border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200"
            value={homeScore}
            onChange={(e) => handleHomeScoreChange(e)}
            disabled={homeForfeit}
          />
        </div>
        <button
          className="hidden md:block bg-blue-500 w-full text-center py-5 rounded-lg text-white text-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={awayScore === "" || homeScore === ""}
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
      <div className="w-full mt-4 block md:hidden">
        <button
          className="text-md bg-blue-500 w-full text-center py-2 rounded-lg text-white text-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={awayScore === "" || homeScore === ""}
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default MatchCard;
