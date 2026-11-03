"use client";
// Game day (supervisors; U1, U5-ROSTER-WORKFLOW.md): one day's games of the
// current season, grouped by what needs doing: on now, later, earlier and
// not scored yet, done. Mobile-first; tapping a game opens its attendance
// and score. Days are Eastern days (lib/dates.ts).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import PageHeading from "@/components/layout/PageHeading";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import GameRow, { useSheets } from "@/components/gameday/GameRow";
import withRoleProtectedRoute from "@/components/hub/withRoleProtectedRoute";
import { useSeason } from "@/context/SeasonContext";
import { fetchSeasonMatches, type Match } from "@/lib/api/matches";
import { addDays, easternDate, easternMidnight } from "@/lib/dates";
import { useNow } from "@/lib/useNow";

/** A game counts as on now for this long after its start. */
const NOW_WINDOW_MS = 2 * 60 * 60 * 1000;

function GameDayPage() {
  const { currentSeason } = useSeason();
  const now = useNow();
  const today = easternDate(new Date(now));
  const [day, setDay] = useState(today);
  const [games, setGames] = useState<Match[] | null>(null);
  const [olderUnscored, setOlderUnscored] = useState(0);

  useEffect(() => {
    if (!currentSeason) return;
    let live = true;
    setGames(null);
    const from = easternMidnight(day);
    const to = new Date(easternMidnight(addDays(day, 1)).getTime() - 1);
    fetchSeasonMatches(currentSeason.id, { from: from.toISOString(), to: to.toISOString() }).then(
      ({ items }) => live && setGames(items),
      () => live && setGames([])
    );
    // Games from before this day still waiting for a score.
    fetchSeasonMatches(currentSeason.id, {
      status: "scheduled",
      to: new Date(Math.min(from.getTime(), Date.now()) - 1).toISOString(),
      page: 1,
      pageSize: 1,
    }).then(({ total }) => live && setOlderUnscored(total), () => {});
    return () => {
      live = false;
    };
  }, [currentSeason, day]);

  const sheets = useSheets(games ?? []);
  const sportOf = useMemo(() => new Map((currentSeason?.sports ?? []).map((s) => [s.id, s])), [currentSeason]);

  const groups = useMemo(() => {
    const g = { now: [] as Match[], later: [] as Match[], unscored: [] as Match[], done: [] as Match[] };
    for (const m of games ?? []) {
      const start = new Date(m.startsAt).getTime();
      if (m.result || m.status === "cancelled") g.done.push(m);
      else if (start > now) g.later.push(m);
      else if (now - start < NOW_WINDOW_MS) g.now.push(m);
      else g.unscored.push(m);
    }
    return g;
  }, [games, now]);

  const label = new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen pt-20 pb-16">
      <PageHeading heading="Game Day" />
      <div className="max-w-xl mx-auto px-3 space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900 px-2 py-2">
          <button aria-label="Previous day" className="p-3" onClick={() => setDay(addDays(day, -1))}>
            <FaChevronLeft />
          </button>
          <div className="text-center">
            <div className="font-semibold">{day === today ? `Today · ${label}` : label}</div>
            <div className="flex items-center justify-center gap-3 text-xs">
              <input
                type="date"
                aria-label="Pick a day"
                className="bg-transparent text-gray-500"
                value={day}
                onChange={(e) => e.target.value && setDay(e.target.value)}
              />
              {day !== today && (
                <button className="text-blue-600 dark:text-blue-400" onClick={() => setDay(today)}>
                  Today
                </button>
              )}
            </div>
          </div>
          <button aria-label="Next day" className="p-3" onClick={() => setDay(addDays(day, 1))}>
            <FaChevronRight />
          </button>
        </div>

        {olderUnscored > 0 && (
          <Link
            href="/hub/add-scores"
            className="block rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm px-3 py-2"
          >
            ⚠ {olderUnscored} earlier {olderUnscored === 1 ? "game is" : "games are"} still waiting for a score →
          </Link>
        )}

        {games === null ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : games.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No games this day.</p>
        ) : (
          (
            [
              ["now", "Now"],
              ["unscored", "Earlier, not scored ⚠"],
              ["later", "Later"],
              ["done", "Done"],
            ] as const
          ).map(([key, title]) =>
            groups[key].length === 0 ? null : (
              <section key={key}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1 pb-1">{title}</h3>
                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-950 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                  {groups[key].map((m) => (
                    <GameRow key={m.id} match={m} sport={sportOf.get(m.sportId)} sheet={sheets.get(m.id)} />
                  ))}
                </div>
              </section>
            )
          )
        )}
      </div>
    </div>
  );
}

export default withRoleProtectedRoute(GameDayPage, (viewer) => viewer.can.takeAttendance);
