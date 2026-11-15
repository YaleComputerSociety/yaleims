"use client";
// The Day view: the older one-day layout, kept as a choice (G15). A date
// strip over the season's days, a dot on each day with games, and the chosen
// day's games by competition. It reads the whole season once
// (hooks/useSeasonGames.ts), which the strip needs; the List view never does.
import { useMemo } from "react";
import { useSeasonGames } from "@/hooks/useSeasonGames";
import type { Match } from "@/lib/api/matches";
import type { MyMatch } from "@/lib/api/me";
import { easternDate } from "@/lib/dates";
import { groupGames, matchesFilter, type Competition, type ListFilter } from "@/lib/games";
import type { EasternDate } from "@/types/firestore";
import DateScroller from "./DateScroller";
import GamesByDay from "./GamesByDay";

interface DayViewProps {
  seasonId: string;
  /** The season's first calendar year: the strip runs from its September to the next June. */
  startYear: number;
  day: EasternDate;
  onDay: (day: EasternDate) => void;
  filter: ListFilter;
  competitionOf: (game: Match) => Competition;
  myEntries: Map<string, MyMatch["mine"]>;
  now: Date;
}

// The strip works in local dates; the day string is what both sides agree on.
const toLocalMidnight = (day: EasternDate) => new Date(`${day}T00:00:00`);
const toDay = (date: Date): EasternDate =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function DayView({ seasonId, startYear, day, onDay, filter, competitionOf, myEntries, now }: DayViewProps) {
  const season = useSeasonGames(seasonId);
  const daysWithGames = useMemo(() => new Set((season ?? []).map((game) => easternDate(new Date(game.startsAt)))), [season]);
  const days = useMemo(() => {
    const games = (season ?? []).filter((game) => easternDate(new Date(game.startsAt)) === day && matchesFilter(game, filter, competitionOf(game), now));
    return groupGames(games, competitionOf);
  }, [season, day, filter, competitionOf, now]);

  if (season === null) return <div className="h-[76px] rounded-xl bg-gray-200/60 dark:bg-gray-900/60 animate-pulse" aria-busy />;
  return (
    <div className="space-y-3">
      <DateScroller
        selectedDate={toLocalMidnight(day)}
        onDateSelect={(date) => onDay(toDay(date))}
        minDate={new Date(startYear, 8, 1)}
        maxDate={new Date(startYear + 1, 5, 30)}
        highlightedDates={daysWithGames}
      />
      {days.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          No games on this day{Object.values(filter).some(Boolean) ? " that pass the filters" : ""}.
        </p>
      ) : (
        <GamesByDay days={days} today={easternDate(now)} now={now} myEntries={myEntries} />
      )}
    </div>
  );
}
