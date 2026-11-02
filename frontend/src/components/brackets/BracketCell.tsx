"use client";

import React from "react";
import Image from "next/image";
import type { BracketDetail } from "@/lib/api/brackets";
import type { Match } from "@/lib/api/matches";
import { collegeName } from "@/lib/colleges";
import "react-loading-skeleton/dist/skeleton.css";
import { getCollegeFlag } from "@/lib/images";

// ── The cells of a bracket ─────────────────────────────────────────────────

/** One slot as the bracket draws it: a game, or a bye (its college moves on without one). */
export type BracketCellData =
  | { kind: "game"; slot: number; round: string; time: string; match: Match | null /* null: its game is gone */ }
  | { kind: "bye"; slot: number; round: string; time: string; collegeId: string | null; seed: number | null };

/** The bracket's cells by slot. A bye without a time of its own shows the bracket's first start. */
export function bracketCells(bracket: BracketDetail): BracketCellData[] {
  const games = new Map(bracket.matches.map((m) => [m.id, m]));
  const firstStart = bracket.matches.map((m) => m.startsAt).sort()[0] ?? "";
  return [...bracket.slots]
    .sort((a, b) => a.slot - b.slot)
    .map((s): BracketCellData => {
      if (s.matchId) {
        const match = games.get(s.matchId) ?? null;
        return { kind: "game", slot: s.slot, round: s.round, time: match?.startsAt ?? firstStart, match };
      }
      return { kind: "bye", slot: s.slot, round: s.round, time: s.byeStartsAt ?? firstStart, collegeId: s.byeCollegeId, seed: s.byeSeed };
    });
}

// ── The cell ───────────────────────────────────────────────────────────────

interface BracketCellProps {
  cell: BracketCellData | undefined;
  setHoveredTeam: (team: string | null) => void;
}

// UPDATED: Added assignable Medal styles
const getMedalTextStyle = (medal: "gold" | "silver" | null) => {
  switch (medal) {
    case "gold":
      return "bg-gradient-to-r from-yellow-300 to-yellow-500 text-transparent bg-clip-text font-extrabold";
    case "silver":
      return "bg-gradient-to-r from-gray-300 to-gray-500 text-transparent bg-clip-text font-bold";
    default:
      return "text-black dark:text-white";
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

const getTimeString = (timestamp: string) => {
  return new Date(timestamp).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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

// UPDATED: Created errorbracketcell to handle cell generation for !match and error.
const ErrorBracketCell = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <div className="relative bg-white dark:bg-gray-950 rounded-3xl shadow-lg w-56 aspect-[288/155] flex flex-col justify-center items-center border border-gray-200 dark:border-gray-800">
    <div className="z-20 flex flex-col items-center justify-center space-y-2 text-center">
      <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-xs px-3 py-1 rounded-full">
        {title}
      </div>
      <div className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-[11px] font-medium px-3 py-1 rounded-full max-w-[80%]">
        {message}
      </div>
    </div>
  </div>
);

const BracketCell: React.FC<BracketCellProps> = ({ cell, setHoveredTeam }) => {
  if (!cell || (cell.kind === "game" && !cell.match)) {
    return (
      <ErrorBracketCell
        title="🔎 Match not Found"
        message="This match could not be loaded."
      />
    );
  }
  const displayTime = getTimeString(cell.time);

  // A bye has its college on top; a game, the away side on top and home below.
  const game = cell.kind === "game" ? cell.match! : null;
  const isBye = !game;
  const topCollege = game ? game.awayCollegeId : cell.kind === "bye" ? cell.collegeId : null;
  const bottomCollege = game?.homeCollegeId ?? null;
  const topSeed = game ? game.awaySeed : cell.kind === "bye" ? cell.seed : null;
  const awayCollegeName = collegeName(topCollege) ?? "TBD";
  const homeCollegeName = collegeName(bottomCollege) ?? "TBD";
  const result = game?.result ?? null;

  // will be 'away', 'home' or null
  const winningTeam = result?.outcome === "away" ? "away" : result?.outcome === "home" ? "home" : null;

  // UPDATED: for medal rendering :)
  let topMedal: "gold" | "silver" | null = null;
  let bottomMedal: "gold" | "silver" | null = null;

  if (cell.round === "Final" && result) {
    if (winningTeam === "away") {
      topMedal = "gold";
      bottomMedal = "silver";
    } else if (winningTeam === "home") {
      topMedal = "silver";
      bottomMedal = "gold";
    }
  }

  return (
    <div className="relative transition-all bg-white dark:bg-gray-950 rounded-3xl shadow-lg w-56
     aspect-[288/155] flex flex-col justify-between p-4 border border-gray-200 dark:border-gray-800">
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-300 dark:bg-gray-700 transform -translate-y-1/2 z-20" />

      {/* Top team */}
      <div className="flex items-center justify-between z-10">
        <div 
          className="flex items-center space-x-1"
          onMouseEnter={() => setHoveredTeam(topCollege)}
          onMouseLeave={() => setHoveredTeam(null)} 
        >
          {/* only show image if college not TBD */}
          {awayCollegeName !== "TBD" && (
            <Image
              src={getCollegeFlag(awayCollegeName)}
              alt={awayCollegeName}
              width={24}
              height={24}
              className="w-6 h-6"
              unoptimized
            />
          )}
          <div className="flex items-center space-x-1">
            <span
              className={`font-semibold cursor-pointer text-sm break-words max-w-[120px] leading-tight text-left flex items-center space-x-1 ${getMedalTextStyle(
                topMedal
              )}`}
              title={awayCollegeName}             
            >
              <span>{getMedalIcon(topMedal)}</span>
              <span>{formatCollegeName(awayCollegeName)}</span>
            </span>

            <div
              className={`bg-gray-100 dark:bg-gray-800 text-sm rounded-full px-1 py-[6px] w-[24px] h-[28px] flex items-center justify-center font-bold self-start`}
              style={{ position: "relative", top: "-8px" }}
            >
              {topSeed ?? ""}
            </div>
          </div>
        </div>

        {/* Inline BYE or nothing */}
        {isBye && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-2 py-2 font-semibold">
            BYE
          </div>
        )}
      </div>

      {/* Bottom team, hidden if BYE */}
      {!isBye && (
        <>
          {/* Score section */}
          <div className="absolute top-1/2 right-4 flex flex-col items-center space-y-2 z-10 transform -translate-y-1/2">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl px-1 py-3 flex flex-col justify-center items-center w-12 h-31 text-base font-extrabold space-y-2">
              <span
                className={
                  winningTeam === "away" ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-600"
                }
              >
                {result ? result.awayScore : "?"}
              </span>
              <span
                className={
                  winningTeam === "home" ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-600"
                }
              >
                {result ? result.homeScore : "?"}
              </span>
            </div>
          </div>

          {/* Bottom team name/seed */}
          <div className="flex items-center justify-between z-10">
            <div 
              className="flex items-center space-x-1"
              onMouseEnter={() => setHoveredTeam(bottomCollege)}
              onMouseLeave={() => setHoveredTeam(null)}
            >
              {/* only show image if college not TBD */}
              {homeCollegeName !== "TBD" && (
                <Image
                  src={getCollegeFlag(homeCollegeName)}
                  alt={homeCollegeName}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                  unoptimized
                />
              )}
              <div className="flex items-center space-x-1">
                <span
                  className={`font-semibold cursor-pointer text-sm break-words max-w-[120px] leading-tight text-left flex items-center space-x-1 ${getMedalTextStyle(
                    bottomMedal
                  )}`}
                  title={homeCollegeName}
                >
                  <span>{getMedalIcon(bottomMedal)}</span>
                  <span>{formatCollegeName(homeCollegeName)}</span>
                </span>

                <span
                  className={`bg-gray-100 dark:bg-gray-800 text-sm rounded-full px-1 py-[6px] w-[24px] h-[28px] flex items-center justify-center font-bold self-start`}
                  style={{ position: "relative", top: "-8px" }}
                >
                  {game?.homeSeed ?? ""}
                </span>
              </div>
            </div>
          </div>
          
        </>
      )}
      {/* 🕒 Display time in bottom right */}
      <div className="absolute bottom-1 right-5 text-[10px] text-gray-500 dark:text-gray-400 font-medium z-30">
        {displayTime}
      </div>
    </div>
  );
};

export default BracketCell;
