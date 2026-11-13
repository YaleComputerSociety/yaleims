"use client";
// The Hub's "Your games": the games the viewer signed up for that haven't
// started, this season, drawn as the games page draws them (GamesByDay), each
// with its Withdraw button; a withdrawal takes the game off the list.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import GamesByDay from "@/components/games/GamesByDay";
import SignUpButton from "@/components/games/SignUpButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useSeason } from "@/context/SeasonContext";
import { useSeasonBrackets } from "@/hooks/useSeasonBrackets";
import type { Match } from "@/lib/api/matches";
import { fetchMyMatches, type MyMatch } from "@/lib/api/me";
import type { RosterEntry } from "@/lib/api/roster";
import { easternDate } from "@/lib/dates";
import { competitionOf, groupGames } from "@/lib/games";
import { useNow } from "@/lib/useNow";

export default function UserMatches() {
  const { currentSeason } = useSeason();
  const seasonId = currentSeason?.id ?? null;
  const brackets = useSeasonBrackets(seasonId);
  const [games, setGames] = useState<MyMatch[] | null>(null);
  const nowMs = useNow();
  const now = useMemo(() => new Date(nowMs), [nowMs]);

  useEffect(() => {
    if (!seasonId) return;
    let live = true;
    fetchMyMatches({ seasonId, upcoming: true }).then(
      ({ items }) => live && setGames(items),
      (error) => console.error("Failed to fetch user matches:", error),
    );
    return () => {
      live = false;
    };
  }, [seasonId]);

  const sportOf = useMemo(() => new Map((currentSeason?.sports ?? []).map((sport) => [sport.id, sport])), [currentSeason]);
  const competition = useCallback(
    (game: Match) => competitionOf(game, sportOf.get(game.sportId), game.bracketId ? brackets?.get(game.bracketId) : undefined),
    [sportOf, brackets],
  );
  const myEntries = useMemo(() => new Map((games ?? []).map((game) => [game.id, game.mine])), [games]);
  // Withdrawn: off the list; signed up again (the button allows it): back with the new entry.
  const changed = (game: MyMatch, entry: RosterEntry | null) =>
    setGames((previous) => {
      const others = (previous ?? []).filter((g) => g.id !== game.id);
      return entry ? [...others, { ...game, mine: { captainStatus: entry.captainStatus, present: entry.present === true, underReview: false } }] : others;
    });

  if (games === null || brackets === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }
  if (games.length === 0) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-400 py-4 text-sm">
        No upcoming games.{" "}
        <Link href="/sign-up" className="underline">
          Sign up for some!
        </Link>
      </div>
    );
  }
  return (
    <div className="max-h-80 overflow-y-auto">
      <GamesByDay
        days={groupGames(games, competition)}
        today={easternDate(now)}
        now={now}
        myEntries={myEntries}
        sticky={false}
        action={(game) => <SignUpButton match={game} mine={myEntries.get(game.id)} onChanged={(entry) => changed(game as MyMatch, entry)} />}
      />
    </div>
  );
}
