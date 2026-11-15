"use client";
// One game's page (GAMES-REDESIGN-PLAN §2.2), where a row of the games list
// leads: what, when and where; the score, or "vs"; the viewer's own sign-up
// (the one place to sign up or withdraw, G6); the participants, as far as the
// server lets this viewer see them (lib/participants.ts); a score report; and
// for staff the edit button and the way to the roster sheet. Signed in only
// (D45).
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaChevronLeft } from "react-icons/fa";
import FavoriteStar from "@/components/games/FavoriteStar";
import Participants from "@/components/games/Participants";
import { ReportScoreButton } from "@/components/games/ReportScoreModal";
import SignUpButton from "@/components/games/SignUpButton";
import { EditMatchButton } from "@/components/hub/admin/EditMatchModal";
import LoadingScreen from "@/components/layout/LoadingScreen";
import PageHeading from "@/components/layout/PageHeading";
import SignInRequired from "@/components/layout/SignInRequired";
import { useSeasonDetail } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import { useSeasonBrackets } from "@/hooks/useSeasonBrackets";
import { fetchMatch, type Match } from "@/lib/api/matches";
import { fetchRoster, type Roster } from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";
import { calendarLink, matchTypeLabel, pointsEarned } from "@/lib/format";
import { competitionOf, gameDateTime, rowState, type RowState } from "@/lib/games";
import { getCollegeFlag } from "@/lib/images";
import { LEVELS, levelAt } from "@/lib/rosterLevels";
import { useNow } from "@/lib/useNow";
import type { MatchResult } from "@/types/firestore";

export default function GamePage() {
  const { seasonId, matchId } = useParams<{ seasonId: string; matchId: string }>();
  const { viewer, loading } = useSession();
  const season = useSeasonDetail(seasonId);
  const brackets = useSeasonBrackets(viewer ? seasonId : null);
  const nowMs = useNow();
  const [match, setMatch] = useState<Match | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewer) return;
    let live = true;
    fetchMatch(seasonId, matchId).then(
      (game) => live && setMatch(game),
      (err) => live && setError((err as Error).message),
    );
    return () => {
      live = false;
    };
  }, [viewer, seasonId, matchId]);

  // The participants and the viewer's own entry come together (GET …/roster); read again after a sign-up or a withdrawal.
  const loadRoster = useCallback(() => {
    if (!viewer) return;
    fetchRoster(seasonId, matchId).then(setRoster, (err) => console.error("Failed to load the participants:", err));
  }, [viewer, seasonId, matchId]);
  useEffect(loadRoster, [loadRoster]);

  if (loading) return <LoadingScreen />;
  if (!viewer) return <SignInRequired heading="Games" message="Sign in to see this game." />;
  if (error) return <Problem message={error} />;
  if (!match || !season || !brackets) return <LoadingScreen />;

  const now = new Date(nowMs);
  const sport = season.sports.find((s) => s.id === match.sportId);
  const competition = competitionOf(match, sport, match.bracketId ? brackets.get(match.bracketId) : undefined);
  const state = rowState(match, now);
  const staff = viewer.can.takeAttendance || viewer.can.score;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <PageHeading heading="Games" />
      <div className="max-w-xl mx-auto px-3 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/games" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
            <FaChevronLeft /> Games
          </Link>
          <div className="flex items-center gap-3">
            <EditMatchButton match={match} />
            {staff && (
              <Link href={`/hub/games/${seasonId}/${matchId}`} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Roster &amp; score →
              </Link>
            )}
          </div>
        </div>

        <header className="rounded-2xl bg-gray-50 dark:bg-gray-900 px-4 py-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <span aria-hidden>{competition.emoji}</span>
            {competition.href ? (
              <Link href={competition.href} className="hover:underline">
                {competition.name} →
              </Link>
            ) : (
              <span>{competition.name}</span>
            )}
            <span>· {competition.kind === "regular" ? "Regular season" : matchTypeLabel(match, competition.kind === "tournament")}</span>
            <FavoriteStar kind="sport" id={match.sportId} name={sport?.name ?? "this sport"} />
          </div>
          <ScoreBoard match={match} state={state} />
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {gameDateTime(match)}
            {match.venue && ` · ${match.venue}`}
            {match.venueDetail && ` · ${match.venueDetail}`}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {state === "upcoming" && (
              <a href={calendarLink(match, sport?.name ?? "")} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                Add to calendar
              </a>
            )}
            {match.result && (
              <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <ReportScoreButton match={match} sportName={sport?.name ?? ""} /> Report a wrong score
              </span>
            )}
          </div>
        </header>

        {state === "upcoming" && <SignUpBlock match={match} roster={roster} viewerCollegeId={viewer.collegeId} onChanged={loadRoster} />}

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3">
          <h3 className="text-sm font-semibold mb-2">Participants</h3>
          {match.status === "cancelled" ? (
            <p className="text-xs text-gray-500">A cancelled game has no participants.</p>
          ) : roster ? (
            <Participants match={match} roster={roster} />
          ) : (
            <p className="text-xs text-gray-500">Loading…</p>
          )}
        </section>
      </div>
    </div>
  );
}

/** Flags, names (each leading to the college's games), the score or "vs", the state and the points earned. */
function ScoreBoard({ match, state }: { match: Match; state: RowState }) {
  const side = (which: "home" | "away") => {
    const id = which === "home" ? match.homeCollegeId : match.awayCollegeId;
    const name = collegeName(id) ?? "TBD";
    const points = pointsEarned(match, which);
    const won = match.result?.outcome === which;
    return (
      <div className="flex flex-col items-center gap-1 min-w-0 text-center">
        {id ? (
          <Image src={getCollegeFlag(name)} alt="" width={48} height={48} className="rounded-full" />
        ) : (
          <span className="w-12 h-12 rounded-full border border-dashed border-gray-400" aria-hidden />
        )}
        {id ? (
          <span className="inline-flex items-center">
            <Link href={`/games?college=${id}`} className={`text-sm hover:underline ${won ? "font-bold" : ""}`}>
              {name}
            </Link>
            <FavoriteStar kind="college" id={id} name={name} />
          </span>
        ) : (
          <span className="text-sm text-gray-500">{name}</span>
        )}
        {points !== null && <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">+{points} pts</span>}
      </div>
    );
  };
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
      {side("home")}
      <div className="flex flex-col items-center gap-1">
        {match.result ? (
          <span className="text-3xl font-bold tabular-nums">
            {match.result.homeScore ?? "–"} : {match.result.awayScore ?? "–"}
          </span>
        ) : (
          <span className="text-2xl font-semibold text-gray-400">vs</span>
        )}
        <StateBadge state={state} result={match.result} />
      </div>
      {side("away")}
    </div>
  );
}

function StateBadge({ state, result }: { state: RowState; result: MatchResult | null }) {
  const text =
    state === "upcoming" ? "Upcoming"
    : state === "live" ? "LIVE"
    : state === "unscored" ? "Not yet scored"
    : state === "cancelled" ? "Cancelled"
    : result?.outcome === "double_forfeit" ? "Double forfeit"
    : result?.forfeit ? "Forfeit"
    : "Final";
  const tone = state === "live" || state === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${tone}`}>{text}</span>;
}

/**
 * Signing up and withdrawing (G6: this page is where it happens). Players of
 * either college sign up; whoever is on the game withdraws, until the
 * supervisor confirmed them (C21). Shown for upcoming games only (C23: never
 * on a cancelled one).
 */
function SignUpBlock({ match, roster, viewerCollegeId, onChanged }: { match: Match; roster: Roster | null; viewerCollegeId: string | null; onChanged: () => void }) {
  if (!roster) return null;
  const mine = roster.mine;
  const plays = viewerCollegeId !== null && match.collegeIds.includes(viewerCollegeId);
  if (!mine && !plays) return null;
  const level = mine && levelAt(mine, false);
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between gap-3">
      <div className="text-sm">
        {mine ? (
          <>
            <span className="font-semibold">You&apos;re on this game</span>
            {level && level !== "signed-up" && (
              <span className="text-emerald-700 dark:text-emerald-400">
                {" "}· {LEVELS[level].label} {LEVELS[level].mark}
              </span>
            )}
            {mine.present === true && <span className="block text-xs text-gray-500 dark:text-gray-400">Confirmed by the supervisor: ask them to take you off.</span>}
          </>
        ) : (
          <span>Your college plays this game.</span>
        )}
      </div>
      <SignUpButton match={match} mine={mine} onChanged={onChanged} />
    </section>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div className="min-h-screen pt-20 px-6">
      <PageHeading heading="Games" />
      <p className="mt-10 text-center text-red-600">{message}</p>
      <p className="mt-2 text-center">
        <Link href="/games" className="underline">
          Back to the games
        </Link>
      </p>
    </div>
  );
}
