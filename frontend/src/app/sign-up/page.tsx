"use client";
// The sign-up page (GAMES-REDESIGN-PLAN §2.2a): the viewer's college's
// upcoming games by day and competition, each with its Sign up / Withdraw
// button, so one page is the place to sign up for the week. Reached from the
// Hub; replaces /schedules (G6: the games list itself shows no sign-up
// buttons). A viewer without a college picks one to browse; signing up stays
// their own college's business (the API checks). Signed in only (D45).
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import GamesList from "@/components/games/GamesList";
import SignUpButton from "@/components/games/SignUpButton";
import SportChips from "@/components/games/SportChips";
import LoadingScreen from "@/components/layout/LoadingScreen";
import PageHeading from "@/components/layout/PageHeading";
import SignInRequired from "@/components/layout/SignInRequired";
import GlassDropdown from "@/components/ui/GlassDropdown";
import { useSeason } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import { useSeasonBrackets } from "@/hooks/useSeasonBrackets";
import type { Match } from "@/lib/api/matches";
import { fetchMyMatches, type MyMatch } from "@/lib/api/me";
import type { RosterEntry } from "@/lib/api/roster";
import { COLLEGES, collegeName } from "@/lib/colleges";
import { easternDate } from "@/lib/dates";
import { competitionOf } from "@/lib/games";
import { useNow } from "@/lib/useNow";

export default function SignUpPage() {
  const { viewer, loading } = useSession();
  const { currentSeason } = useSeason();
  const seasonId = currentSeason?.id ?? null;
  const brackets = useSeasonBrackets(viewer ? seasonId : null);
  const nowMs = useNow();
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const [sportId, setSportId] = useState("");
  const [pickedCollege, setPickedCollege] = useState("");
  const collegeId = viewer?.collegeId ?? pickedCollege;

  const sportOf = useMemo(() => new Map((currentSeason?.sports ?? []).map((sport) => [sport.id, sport])), [currentSeason]);
  const competition = useCallback(
    (game: Match) => competitionOf(game, sportOf.get(game.sportId), game.bracketId ? brackets?.get(game.bracketId) : undefined),
    [sportOf, brackets],
  );

  // The viewer's entries on upcoming games; kept up to date here as they sign up and withdraw.
  const [myEntries, setMyEntries] = useState<Map<string, MyMatch["mine"]>>(new Map());
  useEffect(() => {
    if (!viewer || !seasonId) return;
    let live = true;
    fetchMyMatches({ seasonId, upcoming: true }).then(
      ({ items }) => live && setMyEntries(new Map(items.map((m) => [m.id, m.mine]))),
      (err) => console.error("Failed to load your games:", err),
    );
    return () => {
      live = false;
    };
  }, [viewer, seasonId]);
  const changed = (matchId: string, entry: RosterEntry | null) =>
    setMyEntries((previous) => {
      const next = new Map(previous);
      if (entry) next.set(matchId, { captainStatus: entry.captainStatus, present: entry.present === true, underReview: false });
      else next.delete(matchId);
      return next;
    });

  if (loading) return <LoadingScreen />;
  if (!viewer) return <SignInRequired heading="Sign up for games" message="Sign in to sign up for games." />;
  if (!currentSeason || !seasonId || !brackets) return <LoadingScreen />;

  return (
    <div className="min-h-screen">
      <PageHeading heading="Sign up for games" />
      <div className="mt-20 md:mt-16 px-3 sm:px-6 max-w-3xl mx-auto pb-10 space-y-4">
        {viewer.collegeId ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {collegeName(viewer.collegeId)}&apos;s upcoming games. Tap a game for its details and participants;{" "}
            <Link href="/games" className="underline">
              the games page
            </Link>{" "}
            has everything else.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <span>Your college isn&apos;t set yet, so pick one to browse:</span>
            <GlassDropdown placeholder="College" value={pickedCollege} options={COLLEGES.map((c) => ({ value: c.id, label: c.name }))} onChange={setPickedCollege} />
          </div>
        )}
        <SportChips sports={currentSeason.sports} term={currentSeason.currentTerm} value={sportId} onChange={setSportId} />
        {collegeId ? (
          <GamesList
            seasonId={seasonId}
            filter={{ collegeId, sportId: sportId || undefined, status: "upcoming" }}
            anchor={easternDate(now)}
            competitionOf={competition}
            myEntries={myEntries}
            now={now}
            refresh={false}
            emptyMessage="No upcoming games to sign up for."
            action={(game) => <SignUpButton match={game} mine={myEntries.get(game.id)} onChanged={(entry) => changed(game.id, entry)} />}
          />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Pick a college to see its upcoming games.</p>
        )}
      </div>
    </div>
  );
}
