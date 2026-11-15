"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useSeason } from "@/context/SeasonContext";
import Image from "next/image";
import LoadingScreen from "@/components/layout/LoadingScreen";
import GamesByDay from "@/components/games/GamesByDay";
import SignUpButton from "@/components/games/SignUpButton";
import CollegeAffiliation from "@/components/profile/CollegeAffiliation";
import YourName from "@/components/profile/YourName";
import ReviewRequests from "@/components/profile/ReviewRequests";
import Link from "next/link";
import { getCollegeFlag } from "@/lib/images";
import SignInPrompt from "@/components/layout/SignInPrompt";
import { useSeasonBrackets } from "@/hooks/useSeasonBrackets";
import { fetchMatchPage, type Match } from "@/lib/api/matches";
import { fetchMyMatches, type MyMatch } from "@/lib/api/me";
import type { RosterEntry } from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";
import { easternDate } from "@/lib/dates";
import { competitionOf, groupGames, mergeGames, type DayGroup } from "@/lib/games";
import { useNow } from "@/lib/useNow";

/** How many of the college's next games the profile offers to sign up for. */
const UPCOMING_LIMIT = 6;

const Profile = () => {
  const { viewer, loading, signOut } = useSession();
  const { currentSeason } = useSeason();
  // The user's upcoming games, whatever their college, and their college's
  // next ones to sign up for: one set of games, split by the user's entries.
  const [games, setGames] = useState<Match[]>([]);
  const [myEntries, setMyEntries] = useState<Map<string, MyMatch["mine"]>>(new Map());
  const [fetching, setFetching] = useState(false);
  const signedIn = !!viewer;
  const collegeId = viewer?.collegeId ?? null;
  const seasonId = currentSeason?.id ?? null;
  useEffect(() => {
    if (!signedIn || !seasonId) return;
    let live = true;
    setFetching(true);
    Promise.all([
      fetchMyMatches({ seasonId, upcoming: true }),
      collegeId ? fetchMatchPage(seasonId, { collegeId, status: "scheduled", from: new Date().toISOString(), limit: UPCOMING_LIMIT }) : { items: [] },
    ])
      .then(
        ([mine, college]) => {
          if (!live) return;
          setGames(mergeGames(mine.items, college.items, "asc"));
          setMyEntries(new Map(mine.items.map((m) => [m.id, m.mine])));
        },
        (err) => console.error("Error fetching user matches:", err)
      )
      .finally(() => live && setFetching(false));
    return () => {
      live = false;
    };
  }, [signedIn, collegeId, seasonId]);
  const changed = (matchId: string, entry: RosterEntry | null) =>
    setMyEntries((previous) => {
      const next = new Map(previous);
      if (entry) next.set(matchId, { captainStatus: entry.captainStatus, present: entry.present === true, underReview: false });
      else next.delete(matchId);
      return next;
    });

  // The lists as the games page draws them.
  const brackets = useSeasonBrackets(signedIn ? seasonId : null);
  const sportOf = useMemo(() => new Map((currentSeason?.sports ?? []).map((sport) => [sport.id, sport])), [currentSeason]);
  const competition = useCallback(
    (game: Match) => competitionOf(game, sportOf.get(game.sportId), game.bracketId ? brackets?.get(game.bracketId) : undefined),
    [sportOf, brackets],
  );
  const nowMs = useNow();
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const signedUp = groupGames(games.filter((game) => myEntries.has(game.id)), competition);
  const available = groupGames(games.filter((game) => !myEntries.has(game.id)), competition);
  const list = (days: DayGroup[]) => (
    <GamesByDay
      days={days}
      today={easternDate(now)}
      now={now}
      myEntries={myEntries}
      sticky={false}
      action={(game) => <SignUpButton match={game} mine={myEntries.get(game.id)} onChanged={(entry) => changed(game.id, entry)} />}
    />
  );

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading || fetching) {
    return <LoadingScreen />;
  }

  if (!viewer) {
    return (
      <div className="flex justify-center items-center h-screen px-4">
        <SignInPrompt message="Sign in to see your profile." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col max-w-[1500px] mx-auto">
      <div className="flex-grow m-3 ">
        <h2 className="text-lg sm:text-2xl font-semibold text-center mt-10">
          Hey {viewer.name.split(" ")[0]}, play some IMs today!
        </h2>
        <div className="mx-auto p-6 m-4 rounded-lg flex flex-col space-y-6 lg:items-start lg:flex-row lg:space-y-0 lg:space-x-6 justify-center lg:ml-10">
          {/* Right Side: Stats */}
          <div className="flex justify-center items-center flex-col space-y-6 lg:w-2/5 order-1 lg:order-2">
            <div className="p-6  bg-white dark:bg-black shadow-lg rounded-lg space-y-4 flex justify-center flex-col">
              <h2 className="text-lg sm:text-2xl font-semibold text-center">
                Your 2025 Stats Box!
              </h2>
              {viewer.collegeId && (
                <div className="flex justify-center items-center space-x-4">
                  <Image
                    src={getCollegeFlag(collegeName(viewer.collegeId) ?? "")}
                    alt={collegeName(viewer.collegeId) ?? ""}
                    width={100}
                    height={100}
                    className="rounded-md object-contain"
                  />
                </div>
              )}
            </div>

            <YourName />
            <CollegeAffiliation />
            <ReviewRequests />

            <div className="hidden sm:block">
              <button
                onClick={signOut}
                className="mt-6 py-2 px-4 bg-red-500 text-white rounded-md"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Left Side */}
          <div className="flex flex-col space-y-6 lg:w-3/5 order-2 lg:order-1">
            <div className="flex flex-col space-y-2">
              <div className="text-xl font-semibold mb-2">
                Your Upcoming Games
              </div>
              {signedUp.length > 0 ? (
                list(signedUp)
              ) : (
                <div className="text-center mt-8 text-gray-600">
                  No upcoming games found.
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <div className="text-xl font-semibold mb-2">Sign Up Today</div>
              {available.length > 0 ? (
                <div className="w-full">
                  {list(available)}
                  <div className="flex justify-center w pt-4">
                    <Link
                      href="/sign-up"
                      className="p-2 sm:p-4 text-white text-xs sm:text-sm rounded-lg shadow transition duration-200 ease-in-out bg-blue-600 hover:scale-110"
                    >
                      Sign up for more games
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center mt-8 text-gray-600">
                  No available games to sign up for this week.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="sm:hidden text-center">
        <button
          onClick={handleLogout}
          className="mt-6 py-2 px-4 bg-red-500 text-white rounded-md"
        >
          Log Out
        </button>
      </div>
      <br></br>
      <br></br>
      <br></br>
    </div>
  );
};

export default Profile;
