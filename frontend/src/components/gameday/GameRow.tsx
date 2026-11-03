"use client";
// One game in the game-day lists (supervisors' Game day, captains' My team):
// sport, teams, time and place, with its roster counts and score state;
// tapping it opens the game page.
import { useEffect, useState } from "react";
import Link from "next/link";
import { FaChevronRight } from "react-icons/fa";
import type { Match } from "@/lib/api/matches";
import { fetchRosterSheet, type RosterSheet } from "@/lib/api/roster";
import type { Sport } from "@/lib/api/seasons";
import { sideName } from "@/lib/format";
import { useNow } from "@/lib/useNow";

export default function GameRow({
  match,
  sport,
  sheet,
  showDate = false,
}: {
  match: Match;
  sport: Sport | undefined;
  /** The game's sheet (counts), once loaded. */
  sheet?: RosterSheet | null;
  showDate?: boolean;
}) {
  const now = useNow();
  const start = new Date(match.startsAt);
  const time = start.toLocaleString("en-US", {
    ...(showDate ? { weekday: "short", month: "short", day: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
  });
  const playing = sheet?.items.filter((e) => e.captainStatus !== "removed") ?? [];
  const counts = sheet
    ? sheet.supervisor
      ? `Attendance ${playing.filter((e) => e.present).length}/${playing.length}`
      : `${playing.length} signed up · ✓${playing.filter((e) => e.captainStatus === "confirmed").length}`
    : null;
  const state =
    match.status === "cancelled"
      ? "Cancelled"
      : match.result
        ? `Final ${match.result.homeScore ?? "–"}–${match.result.awayScore ?? "–"}`
        : start.getTime() <= now
          ? "Not scored"
          : null;

  return (
    <Link
      href={`/hub/games/${match.seasonId}/${match.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
    >
      <span className="text-xl w-7 text-center" aria-hidden>
        {sport?.emoji ?? "🏆"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">
          {sideName(match.homeCollegeId)} vs {sideName(match.awayCollegeId)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {time}
          {match.venue ? ` · ${match.venue}` : ""}
          {match.venueDetail ? ` · ${match.venueDetail}` : ""}
        </div>
        {(counts || state) && (
          <div className="text-xs mt-0.5 flex gap-2">
            {counts && <span className="text-gray-600 dark:text-gray-300">{counts}</span>}
            {state && (
              <span className={state === "Not scored" ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-gray-500"}>
                {state}
              </span>
            )}
          </div>
        )}
      </div>
      <FaChevronRight className="text-gray-300 dark:text-gray-600 shrink-0" />
    </Link>
  );
}

/** The sheets of these games (for the counts), loaded in parallel; a game the viewer can't see has none. */
export function useSheets(matches: Match[]): Map<string, RosterSheet | null> {
  const [sheets, setSheets] = useState<Map<string, RosterSheet | null>>(new Map());
  const key = matches.map((m) => m.id).join(",");
  useEffect(() => {
    let live = true;
    Promise.all(
      matches.map((m) => fetchRosterSheet(m.seasonId, m.id).then((sheet) => [m.id, sheet] as const, () => [m.id, null] as const))
    ).then((pairs) => live && setSheets(new Map(pairs)));
    return () => {
      live = false;
    };
    // The ids say when the games changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return sheets;
}
