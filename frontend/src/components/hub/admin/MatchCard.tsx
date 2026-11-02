"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FaSpinner, FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import { scoreMatch, type Match } from "@/lib/api/matches";
import type { Sport } from "@/lib/api/seasons";
import { collegeName } from "@/lib/colleges";
import { getCollegeFlag } from "@/utils/versionedImages";

interface MatchCardProps {
  match: Match;
  sport: Sport | undefined;
  onScored?: (matchId: string) => void;
}

/** A started, unscored game with its score and forfeit inputs (admins). */
const MatchCard: React.FC<MatchCardProps> = ({ match, sport, onScored }) => {
  const [awayScore, setAwayScore] = useState<string>("");
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayForfeit, setAwayForfeit] = useState<boolean>(false);
  const [homeForfeit, setHomeForfeit] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [scored, setScored] = useState<boolean>(false);
  const homeName = collegeName(match.homeCollegeId) ?? "";
  const awayName = collegeName(match.awayCollegeId) ?? "";

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
      await scoreMatch(match.seasonId, match.id, {
        homeScore: homeScore === "" ? 0 : parseInt(homeScore),
        awayScore: awayScore === "" ? 0 : parseInt(awayScore),
        homeForfeit,
        awayForfeit,
      });
      setScored(true);
      onScored?.(match.id);
    } catch (error) {
      toast.error(
        `Failed to submit score: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const date = new Date(match.startsAt);

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

  const submitButtonDisabled =
    loading ||
    scored ||
    (awayScore === "" && homeScore === "" && !awayForfeit && !homeForfeit);

  const inputsDisabled = scored;

  const submitButtonConditionalStyling = `${
    loading || scored ? "" : "disabled:bg-gray-400"
  } ${scored ? "bg-green-500" : ""}`;

  const submitButtonText = loading ? (
    <FaSpinner className="animate-spin text-lg mx-auto" />
  ) : scored ? (
    "Scored!"
  ) : (
    "Submit"
  );

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
      <div className="grid md:grid-cols-5 grid-cols-4 bg-white  dark:bg-black justify-between items-center py-4 px-2 md:px-8 rounded-lg shadow">
        <div className="flex flex-col md:flex-row items-center pr-1 lg:pr-8 h-full py-1 justify-between md:justify-around">
          <div className="flex flex-col items-center w-full">
            <p>{formattedTime}</p>
            <p>
              {sport?.name} {sport?.emoji}
            </p>
            <span className="text-gray-400 text-[10px] md:text-xs font-mono mt-1">
              ID: {match.id}
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-between items-start gap-4 sm:pl-4 xl:pl-16 lg:pl-10">
          <div className="flex items-center">
            <Image
              src={getCollegeFlag(awayName)}
              alt={match.awayCollegeId ?? ""}
              width={20}
              height={20}
              className="mr-2 object-contain"
              unoptimized
            />
            <p>{awayName}</p>
          </div>
          <div className="flex items-center">
            <Image
              src={getCollegeFlag(homeName)}
              alt={match.homeCollegeId ?? ""}
              width={20}
              height={20}
              className="mr-2 object-contain"
              unoptimized
            />
            <p>{homeName}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 h-full justify-between">
          <label className="relative flex items-center justify-center">
            <input
              type="checkbox"
              className={`appearance-none w-5 h-5 md:w-10 md:h-8 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500
                ${inputsDisabled ? "" : "hover:cursor-pointer"}
                ${
                  awayForfeit
                    ? "bg-blue-600 border-transparent"
                    : "disabled:bg-gray-200 disabled:border-gray-200"
                }
                ${inputsDisabled ? "opacity-50" : ""}
              `}
              checked={awayForfeit}
              disabled={inputsDisabled}
              onChange={handleAwayCheckboxChange}
            />
            {awayForfeit && (
              <FaCheck
                className="absolute text-white text-xs md:text-lg pointer-events-none"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
          </label>
          <label className="relative flex items-center justify-center">
            <input
              type="checkbox"
              className={`appearance-none w-5 h-5 md:w-10 md:h-8 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500
                ${inputsDisabled ? "" : "hover:cursor-pointer"}
                ${
                  homeForfeit
                    ? "bg-blue-600 border-transparent"
                    : "disabled:bg-gray-200 disabled:border-gray-200"
                }
                ${inputsDisabled ? "opacity-50" : ""}
              `}
              checked={homeForfeit}
              disabled={inputsDisabled}
              onChange={handleHomeCheckboxChange}
            />
            {homeForfeit && (
              <FaCheck
                className="absolute text-white text-xs md:text-lg pointer-events-none"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
          </label>
        </div>
        <div className="flex flex-col items-center gap-4 h-full justify-between">
          <input
            type="text"
            className="dark:bg-black w-5 h-5 md:w-10 md:h-8 text-center border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200"
            value={awayScore}
            onChange={(e) => handleAwayScoreChange(e)}
            disabled={awayForfeit || inputsDisabled}
          />
          <input
            type="text"
            className="dark:bg-black w-5 h-5 md:w-10 md:h-8 text-center border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-200 disabled:border-gray-200"
            value={homeScore}
            onChange={(e) => handleHomeScoreChange(e)}
            disabled={homeForfeit || inputsDisabled}
          />
        </div>
        <button
          className={`hidden md:block bg-blue-500 w-full py-5 rounded-lg text-white text-bold  disabled:cursor-not-allowed flex justify-center items-center ${submitButtonConditionalStyling}`}
          disabled={submitButtonDisabled}
          onClick={handleSubmit}
        >
          <span className="flex items-center justify-center w-full">
            {submitButtonText}
          </span>
        </button>
      </div>
      <div className="w-full mt-4 block md:hidden">
        <button
          className={`text-md bg-blue-500 w-full py-2 rounded-lg text-white text-bold  disabled:cursor-not-allowed flex justify-center items-center ${submitButtonConditionalStyling}`}
          disabled={submitButtonDisabled}
          onClick={handleSubmit}
        >
          <span className="flex items-center justify-center w-full">
            {submitButtonText}
          </span>
        </button>
      </div>
    </div>
  );
};

export default MatchCard;
