"use client";

import Image from "next/image";
import TournamentBadge from "@/components/ui/TournamentBadge";
import { useState } from "react";
import { toast } from "react-toastify";
import { FaCircle, FaMapMarkerAlt } from "react-icons/fa";
import { signUp, withdraw } from "@/lib/api/roster";
import type { Match } from "@/lib/api/matches";
import type { Sport } from "@/lib/api/seasons";
import { collegeName } from "@/lib/colleges";
import { matchTypeLabel, pointsEarned, sideName } from "@/lib/format";
import type { SessionViewer } from "@/lib/api/auth";
import { getCollegeFlag } from "@/lib/images";
import { EditMatchButton } from "@/components/hub/admin/EditMatchModal";
import { ReportScoreButton } from "@/components/games/ReportScoreModal";
import MyEntryStatus, { CancelledBadge } from "@/components/games/MyEntryStatus";
import Participants from "@/components/games/Participants";
import type { MyMatch } from "@/lib/api/me";

const LIVE_WINDOW_MS = 1 * 60 * 60 * 1000; // 1 hour

export type MatchStatus = "live" | "upcoming" | "completed";

/** Completed once scored; live in its first hour; a past game without a score counts as completed too. */
export function getMatchStatus(match: Match): MatchStatus {
  const matchTime = new Date(match.startsAt).getTime();
  const now = Date.now();
  if (match.result) return "completed";
  if (matchTime <= now && now - matchTime < LIVE_WINDOW_MS) return "live";
  if (matchTime > now) return "upcoming";
  return "completed";
}

interface GameCardProps {
  match: Match;
  /** The game's sport (from its season). */
  sport: Sport | undefined;
  /** The game's tournament (hooks/useTournamentNames). */
  tournament: string | undefined;
  onCollegeClick?: (college: string) => void;
  onSportClick?: (sport: string) => void;
  viewer: SessionViewer | null;
  isSignedUp?: boolean;
  /** The viewer's own entry, when they're on the game. */
  mine?: MyMatch["mine"];
  signUpStatusLoading?: boolean;
  onStatusChange?: (matchId: string, signed: boolean) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  match,
  sport,
  tournament,
  onCollegeClick,
  onSportClick,
  viewer,
  isSignedUp = false,
  mine,
  signUpStatusLoading = false,
  onStatusChange,
}) => {
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const status = getMatchStatus(match);
  const { result } = match;
  // A past game the admins haven't scored yet.
  const isUnscored = status === "completed" && !result;

  const isUserTeam =
    !!viewer?.collegeId &&
    (match.homeCollegeId === viewer.collegeId || match.awayCollegeId === viewer.collegeId);

  const isPastMatch = new Date(match.startsAt) < new Date();
  const isCancelled = match.status === "cancelled";

  const changeSignUp = async (signed: boolean) => {
    setSignUpLoading(true);
    try {
      await (signed ? signUp : withdraw)(match.seasonId, match.id);
      onStatusChange?.(match.id, signed);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSignUpLoading(false);
    }
  };

  const homeName = sideName(match.homeCollegeId);
  const awayName = sideName(match.awayCollegeId);
  const isHomeTBD = !match.homeCollegeId;
  const isAwayTBD = !match.awayCollegeId;

  const homeWins = result?.outcome === "home";
  const awayWins = result?.outcome === "away";
  const isDraw = result?.outcome === "draw" || result?.outcome === "double_forfeit";
  const homePoints = pointsEarned(match, "home");
  const awayPoints = pointsEarned(match, "away");

  const timeStr = new Date(match.startsAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const typeLabel = matchTypeLabel(match, tournament !== undefined);
  const sportName = sport?.name ?? "";

  return (
    <div className="bg-gray-50 dark:bg-gray-950 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden transition-shadow duration-200">
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <button
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          onClick={() => onSportClick?.(sportName)}
        >
          <span>{sport?.emoji ?? "🏆"}</span>
          <span>{sportName}</span>
        </button>

        <div className="flex items-center gap-2">
          <TournamentBadge name={tournament} />

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
          {status === "completed" && result?.outcome === "double_forfeit" && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              DEFAULT
            </span>
          )}
          {status === "completed" && result?.forfeit && result.outcome !== "double_forfeit" && (
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
                {homePoints !== null && (
                  <span className="ml-1.5 text-yellow-500 text-xs font-bold">
                    +{homePoints}pts
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
                  {result?.homeScore ?? 0}
                </span>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
              )}
            </div>
          </div>

          {/* Away College */}
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
                {awayPoints !== null && (
                  <span className="ml-1.5 text-yellow-500 text-xs font-bold">
                    +{awayPoints}pts
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
                  {result?.awayScore ?? 0}
                </span>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 min-w-0">
            {match.venue && (
              <span className="flex items-center gap-1 truncate">
                <FaMapMarkerAlt className="flex-none" />
                <span className="truncate">
                  {match.venue}
                  {match.venueDetail ? ` · ${match.venueDetail}` : ""}
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

            {isCancelled && <CancelledBadge />}
            <MyEntryStatus mine={mine} started={isPastMatch} />

            {/* Sign-up button */}
            {/* Withdrawing is open to whoever is on it, whatever their college. */}
            {viewer && status === "upcoming" && !isPastMatch && !isCancelled && (isUserTeam || isSignedUp) && (
              signUpStatusLoading ? (
                <div
                  className="h-6 w-[74px] rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
                  aria-hidden="true"
                />
              ) : (
                <button
                  onClick={() => changeSignUp(!isSignedUp)}
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
              )
            )}

            <EditMatchButton match={match} />
            <ReportScoreButton match={match} sportName={sportName} />
          </div>
        </div>
        <div className="mt-2">
          <Participants match={match} refreshKey={isSignedUp} />
        </div>
      </div>
    </div>
  );
};

export default GameCard;
