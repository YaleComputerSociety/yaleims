"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FaCircle, FaMapMarkerAlt } from "react-icons/fa";
import { Match } from "@src/types/components";
import { toCollegeName, emojiMap, sportsMap } from "@src/utils/helpers";
import { getCollegeFlag } from "@src/utils/versionedImages";
import { EditMatchButton } from "@src/components/Dashboard/Admin/EditMatchModal";
import { ReportScoreButton } from "@src/components/Games/ReportScoreModal";

const LIVE_WINDOW_MS = 1 * 60 * 60 * 1000; // 1 hour

export type MatchStatus = "live" | "upcoming" | "completed";

export function getMatchStatus(match: Match): MatchStatus {
  const matchTime = new Date(match.timestamp).getTime();
  const now = Date.now();
  const hasResult =
    match.winner !== null ||
    match.home_college_score > 0 ||
    match.away_college_score > 0;

  if (hasResult) return "completed";
  if (matchTime <= now && now - matchTime < LIVE_WINDOW_MS) return "live";
  if (matchTime > now) return "upcoming";
  return "completed"; // past with no score → treat as completed
}

interface GameCardProps {
  match: Match;
  onCollegeClick?: (college: string) => void;
  onSportClick?: (sport: string) => void;
  user?: any;
  isSignedUp?: boolean;
  onStatusChange?: (matchId: string, signed: boolean) => void;
  seasonId?: string;
}

const GameCard: React.FC<GameCardProps> = ({
  match,
  onCollegeClick,
  onSportClick,
  user,
  isSignedUp = false,
  onStatusChange,
  seasonId,
}) => {
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const status = getMatchStatus(match);

  // Detect unscored past games (past the live window, but no winner/scores recorded)
  const isUnscored =
    status === "completed" &&
    match.winner === null &&
    (match.home_college_score ?? 0) === 0 &&
    (match.away_college_score ?? 0) === 0 &&
    !match.forfeit;

  const isUserTeam =
    user &&
    (toCollegeName[match.home_college] === user.college ||
      toCollegeName[match.away_college] === user.college);

  const isPastMatch = new Date(match.timestamp) < new Date();

  const handleSignUp = async () => {
    if (!user || !seasonId) return;
    setSignUpLoading(true);
    try {
      const res = await fetch("/api/functions/addMatchParticipant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId,
          matchId: match.id,
          matchTimestamp: match.timestamp,
          participantType:
            toCollegeName[user.college] === toCollegeName[match.home_college]
              ? "home_college_participants"
              : "away_college_participants",
        }),
      });
      if (!res.ok) throw new Error("Failed to sign up");
      onStatusChange?.(match.id, true);
    } catch (err) {
      console.error("Error signing up:", err);
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!user || !seasonId) return;
    setSignUpLoading(true);
    try {
      const res = await fetch("/api/functions/removeMatchParticipant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          participantType:
            toCollegeName[user.college] === toCollegeName[match.home_college]
              ? "home_college_participants"
              : "away_college_participants",
          seasonId,
        }),
      });
      if (!res.ok) throw new Error("Failed to unregister");
      onStatusChange?.(match.id, false);
    } catch (err) {
      console.error("Error unregistering:", err);
    } finally {
      setSignUpLoading(false);
    }
  };

  const {
    home_college,
    away_college,
    home_college_score,
    away_college_score,
    sport,
    timestamp,
    location,
    location_extra,
    winner,
    forfeit,
    type,
  } = match;

  const homeName = toCollegeName[home_college] ?? home_college ?? "TBD";
  const awayName = toCollegeName[away_college] ?? away_college ?? "TBD";
  const isBye = away_college === "Bye";
  const isHomeTBD = !home_college || home_college === "TBD";
  const isAwayTBD = !away_college || away_college === "TBD";

  const homeWins = winner === home_college;
  const awayWins = winner === away_college;
  const isDraw =
    (!forfeit && home_college_score === away_college_score) ||
    winner === "Default" ||
    winner === "Tie";

  const points = isDraw ? (sportsMap[sport] ?? 6) / 2 : (sportsMap[sport] ?? 6);

  const matchDate = new Date(timestamp);
  const timeStr = matchDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Relative day label
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const typeLabel =
    type === "Regular" ? "Regular Season" : `${type} Round`;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden transition-shadow duration-200">
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <button
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          onClick={() => onSportClick?.(sport)}
        >
          <span>{emojiMap[sport] ?? "🏆"}</span>
          <span>{sport}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Match type badge */}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {typeLabel}
          </span>

          {/* Status badge */}
          {status === "live" && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
              <FaCircle className="text-[6px]" />
              LIVE
            </span>
          )}
          {isUnscored && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400">
              NOT YET SCORED
            </span>
          )}
          {status === "completed" && !isUnscored && winner === "Default" && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              DEFAULT
            </span>
          )}
          {status === "completed" && !isUnscored && forfeit && winner !== "Default" && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400">
              FORFEIT
            </span>
          )}
        </div>
      </div>

      {/* Match Body */}
      <div className="px-4 py-3">
        {/* Teams */}
        <div className="space-y-2">
          {/* Home College */}
          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-3 min-w-0 flex-1 text-left"
              onClick={() => onCollegeClick?.(homeName)}
            >
              {isHomeTBD ? (
                <div className="w-7 h-7 flex-none rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a1 1 0 0 0-1 1v1H2a1 1 0 0 0 0 2h1v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7h1a1 1 0 1 0 0-2h-1V4a1 1 0 0 0-1-1H4Zm1 4h10v8H5V7Z" />
                  </svg>
                </div>
              ) : (
                <Image
                  src={getCollegeFlag(homeName)}
                  alt={homeName}
                  width={28}
                  height={28}
                  className="object-contain flex-none rounded-sm"
                  unoptimized
                />
              )}
              <span
                className={`text-sm font-semibold truncate ${
                  status === "completed" && awayWins && !isDraw && !isUnscored
                    ? "text-gray-400 dark:text-gray-500"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {homeName}
                {!isUnscored && (homeWins || (isDraw && status === "completed")) && (
                  <span className="ml-1.5 text-yellow-500 text-xs font-bold">
                    +{points}pts
                  </span>
                )}
              </span>
            </button>

            {/* Home Score */}
            <div className="ml-3 text-right min-w-[2rem]">
              {isUnscored ? (
                <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
              ) : status === "completed" || status === "live" ? (
                <span
                  className={`text-xl font-bold tabular-nums ${
                    status === "completed" && awayWins && !isDraw
                      ? "text-gray-400 dark:text-gray-500"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {home_college_score ?? 0}
                </span>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
              )}
            </div>
          </div>

          {/* Away College */}
          {!isBye ? (
            <div className="flex items-center justify-between">
              <button
                className="flex items-center gap-3 min-w-0 flex-1 text-left"
                onClick={() => onCollegeClick?.(awayName)}
              >
                {isAwayTBD ? (
                  <div className="w-7 h-7 flex-none rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 3a1 1 0 0 0-1 1v1H2a1 1 0 0 0 0 2h1v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7h1a1 1 0 1 0 0-2h-1V4a1 1 0 0 0-1-1H4Zm1 4h10v8H5V7Z" />
                    </svg>
                  </div>
                ) : (
                  <Image
                    src={getCollegeFlag(awayName)}
                    alt={awayName}
                    width={28}
                    height={28}
                    className="object-contain flex-none rounded-sm"
                    unoptimized
                  />
                )}
                <span
                  className={`text-sm font-semibold truncate ${
                    status === "completed" && homeWins && !isDraw && !isUnscored
                      ? "text-gray-400 dark:text-gray-500"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {awayName}
                  {!isUnscored && (!homeWins || (isDraw && status === "completed")) &&
                    status === "completed" && !isDraw && awayWins && (
                      <span className="ml-1.5 text-yellow-500 text-xs font-bold">
                        +{points}pts
                      </span>
                    )}
                  {!isUnscored && isDraw && status === "completed" && (
                    <span className="ml-1.5 text-yellow-500 text-xs font-bold">
                      +{points}pts
                    </span>
                  )}
                </span>
              </button>

              {/* Away Score */}
              <div className="ml-3 text-right min-w-[2rem]">
                {isUnscored ? (
                  <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                ) : status === "completed" || status === "live" ? (
                  <span
                    className={`text-xl font-bold tabular-nums ${
                      status === "completed" && homeWins && !isDraw
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {away_college_score ?? 0}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-1">
              <div className="w-7 h-7 flex-none rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
                BYE
              </div>
              <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">Bye</span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 min-w-0">
            {location && (
              <span className="flex items-center gap-1 truncate">
                <FaMapMarkerAlt className="flex-none" />
                <span className="truncate">
                  {location}
                  {location_extra ? ` · ${location_extra}` : ""}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-2 flex-none">
            {status === "upcoming" && (
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {timeStr}
              </span>
            )}
            {status === "live" && (
              <span className="text-xs font-semibold text-red-500">
                {timeStr}
              </span>
            )}
            {status === "completed" && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {timeStr}
              </span>
            )}

            {/* Sign-up button */}
            {user && status === "upcoming" && !isPastMatch && isUserTeam && (
              <button
                onClick={() => (isSignedUp ? handleUnregister() : handleSignUp())}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={signUpLoading}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150 ${
                  signUpLoading
                    ? "bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed"
                    : isSignedUp
                    ? "bg-green-600 hover:bg-red-500 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {signUpLoading
                  ? "..."
                  : isSignedUp
                  ? isHovered
                    ? "Unregister"
                    : "Playing!"
                  : "Sign Up"}
              </button>
            )}

            <EditMatchButton match={match} />
            <ReportScoreButton match={match} seasonId={seasonId} />

            {status === "upcoming" && (
              user ? (
                <Link
                  href="/odds"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Predict here
                </Link>
              ) : (
                <Link
                  href="/api/auth/login?from=%2Fodds"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Predict here
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
