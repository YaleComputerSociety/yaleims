"use client";
// My team (captains): the upcoming games of the team
// they captain this season, with how many signed up and how many they
// confirmed; tapping a game opens its roster to confirm, remove and add
// players until it starts. Captains of two sports pick one.
import { useEffect, useMemo, useState } from "react";
import PageHeading from "@/components/layout/PageHeading";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import GameRow, { useSheets } from "@/components/gameday/GameRow";
import withRoleProtectedRoute from "@/components/hub/withRoleProtectedRoute";
import { useSeason } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import { fetchSeasonMatches, type Match } from "@/lib/api/matches";
import { collegeName } from "@/lib/colleges";

function MyTeamPage() {
  const { viewer } = useSession();
  const { currentSeason } = useSeason();
  const sports = (currentSeason?.sports ?? []).filter((s) => viewer?.captainOf.includes(s.id));
  const [picked, setPicked] = useState<string | null>(null);
  const sportId = picked ?? sports[0]?.id ?? null;
  const [upcoming, setUpcoming] = useState<Match[] | null>(null);
  const [recent, setRecent] = useState<Match[]>([]);
  const collegeId = viewer?.collegeId ?? null;

  useEffect(() => {
    if (!currentSeason || !sportId || !collegeId) return;
    let live = true;
    setUpcoming(null);
    const now = new Date().toISOString();
    const filter = { collegeId, sportId };
    fetchSeasonMatches(currentSeason.id, { ...filter, from: now }).then(
      ({ items }) => live && setUpcoming(items.filter((m) => m.status !== "cancelled")),
      () => live && setUpcoming([])
    );
    fetchSeasonMatches(currentSeason.id, { ...filter, to: now, order: "desc", page: 1, pageSize: 3 }).then(
      ({ items }) => live && setRecent(items),
      () => {}
    );
    return () => {
      live = false;
    };
  }, [currentSeason, sportId, collegeId]);

  const sheets = useSheets(useMemo(() => [...(upcoming ?? []), ...recent], [upcoming, recent]));
  const sport = sports.find((s) => s.id === sportId);

  return (
    <div className="min-h-screen pt-20 pb-16">
      <PageHeading heading="My Team" />
      <div className="max-w-xl mx-auto px-3 space-y-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-900 px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs text-gray-500">You captain</div>
            <div className="font-semibold">
              {sport?.emoji} {sport?.name} · {collegeName(collegeId)}
            </div>
          </div>
          {sports.length > 1 && (
            <select
              aria-label="Sport"
              className="rounded-md px-2 py-1 text-sm bg-white dark:bg-black ring-1 ring-black/10 dark:ring-white/10"
              value={sportId ?? ""}
              onChange={(e) => setPicked(e.target.value)}
            >
              {sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 px-1">
          Before each game, confirm who&apos;s playing, take off anyone who isn&apos;t and add teammates who didn&apos;t
          sign up. It saves the supervisor time at the field.
        </p>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1 pb-1">Upcoming</h3>
          {upcoming === null ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-gray-500 px-1 py-4">No upcoming games for this team.</p>
          ) : (
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-950 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
              {upcoming.map((m) => (
                <GameRow key={m.id} match={m} sport={sport} sheet={sheets.get(m.id)} showDate />
              ))}
            </div>
          )}
        </section>

        {recent.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1 pb-1">Recent</h3>
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-950 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
              {recent.map((m) => (
                <GameRow key={m.id} match={m} sport={sport} sheet={sheets.get(m.id)} showDate />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default withRoleProtectedRoute(MyTeamPage, (viewer) => viewer.captainOf.length > 0);
