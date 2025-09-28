"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase"; // Your Firebase config
import { toCollegeName } from "@src/utils/helpers";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

interface BracketCellProps {
  matchId: string;
  season: string;
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

const formatCollegeName = (name: string): string => shortNames[name] || name;

// UPDATED: Added Skeleton Bracket Cell because the skeleton in CollegeSummaryCard was rendering strange.
const SkeletonBracketCell = () => (
  /* Top Section */
  <div className="relative bg-white rounded-3xl shadow-lg w-64 aspect-[288/155] flex flex-col justify-between p-4 text-black">
    <div className="absolute top-1/2 left-0 w-full h-[3px] bg-gray-300 transform -translate-y-1/2 z-20" />
    <div className="flex items-center justify-between z-10">
      <div className="flex items-center space-x-2">
        <Skeleton
          circle
          height={24}
          width={24}
          baseColor="#f3f4f6"
          highlightColor="#e5e7eb"
        />
        <div className="flex items-center space-x-1">
          <Skeleton
            height={20}
            width={100}
            baseColor="#f3f4f6"
            highlightColor="#e5e7eb"
          />
          <Skeleton
            height={20}
            width={28}
            baseColor="#f3f4f6"
            highlightColor="#e5e7eb"
          />
        </div>
      </div>
      <Skeleton
        height={32}
        width={48}
        borderRadius={12}
        baseColor="#f3f4f6"
        highlightColor="#e5e7eb"
      />
    </div>

    <div className="flex items-center justify-between z-10">
      <div className="flex items-center space-x-2">
        <Skeleton
          circle
          height={24}
          width={24}
          baseColor="#f3f4f6"
          highlightColor="#e5e7eb"
        />
        <div className="flex items-center space-x-1">
          <Skeleton
            height={20}
            width={100}
            baseColor="#f3f4f6"
            highlightColor="#e5e7eb"
          />
          <Skeleton
            height={20}
            width={28}
            baseColor="#f3f4f6"
            highlightColor="#e5e7eb"
          />
        </div>
      </div>
      <Skeleton
        height={32}
        width={48}
        borderRadius={12}
        baseColor="#f3f4f6"
        highlightColor="#e5e7eb"
      />
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

const BracketCell: React.FC<BracketCellProps> = ({ matchId, season }) => {
  const [match, setMatch] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setLoading(true);
        setError(null);
        const matchDocRef = doc(db, "matches_testing", "seasons", season, matchId);
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
      <ErrorBracketCell title="🚫 Error" message="Failed to load match." />
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
            <span
              className={`font-semibold text-lg break-words max-w-[120px] leading-tight text-left flex items-center space-x-1 ${getMedalTextStyle(
                topMedal
              )}`}
              title={awayCollegeName}
            >
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
                <span
                  className={`font-semibold text-lg break-words max-w-[120px] leading-tight text-left flex items-center space-x-1 ${getMedalTextStyle(
                    bottomMedal
                  )}`}
                  title={homeCollegeName}
                >
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
