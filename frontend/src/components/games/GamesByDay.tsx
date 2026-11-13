"use client";
// Games under a sticky header per Eastern day and a header per competition
// within it (lib/games.ts groupGames). The games page's list, its Day view,
// the sign-up page and the Hub's and Profile's lists all draw this; what
// differs is where their games come from.
import Link from "next/link";
import type { ReactNode } from "react";
import type { Match } from "@/lib/api/matches";
import type { MyMatch } from "@/lib/api/me";
import { matchTypeLabel } from "@/lib/format";
import { dayLabel, type CompetitionGroup, type DayGroup } from "@/lib/games";
import type { EasternDate } from "@/types/firestore";
import GameRow from "./GameRow";

interface GamesByDayProps {
  days: DayGroup[];
  today: EasternDate;
  now: Date;
  /** The viewer's entries by game id. */
  myEntries: Map<string, MyMatch["mine"]>;
  /** Something for a row's right edge (the sign-up page's button). */
  action?: (match: Match) => ReactNode;
  /** Something after a competition's name (the favorites' ★). */
  competitionAside?: (group: CompetitionGroup) => ReactNode;
}

export default function GamesByDay({ days, today, now, myEntries, action, competitionAside }: GamesByDayProps) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
      {days.map((day) => (
        <section key={day.day} aria-label={dayLabel(day.day, today)}>
          <h2
            className={`sticky top-16 md:top-0 z-10 px-3 py-2 text-xs font-bold uppercase tracking-wide border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 ${
              day.day < today ? "text-gray-500 dark:text-gray-400" : "text-gray-800 dark:text-gray-100"
            }`}
          >
            {dayLabel(day.day, today)}
          </h2>
          {day.competitions.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                <span aria-hidden>{group.emoji}</span>
                {group.href ? (
                  <Link href={group.href} className="hover:underline">
                    {group.name} →
                  </Link>
                ) : (
                  <span>{group.name}</span>
                )}
                {competitionAside?.(group)}
              </div>
              {group.games.map((game) => (
                <GameRow
                  key={game.id}
                  match={game}
                  now={now}
                  mine={myEntries.get(game.id)}
                  detail={group.kind === "regular" ? undefined : matchTypeLabel(game, group.kind === "tournament")}
                  action={action?.(game)}
                />
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
