"use client";

import React, { useEffect, useState, useContext } from "react";
import LoadingScreen from "@/components/layout/LoadingScreen";
import CollegeSummaryCard from "@/components/scores/CollegeSummaryCard";
import CollegeSummaryCardMobile from "@/components/scores/CollegeSummaryCardMobile";
import { FiltersContext } from "@/context/FiltersContext";
import TableHeader from "@/components/scores/TableHeader";
import MatchesTable from "@/components/scores/MatchTable";
import Pagination from "@/components/ui/Pagination";
import GlassDropdown from "@/components/ui/GlassDropdown";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PageHeading from "@/components/layout/PageHeading";
import { useSeason, useSeasonDetail } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import { useStandings } from "@/hooks/useStandings";
import SignInPrompt from "@/components/layout/SignInPrompt";
import { fetchPlayedMatches, type Match } from "@/lib/api/matches";
import { addDays, easternDate, easternMidnight } from "@/lib/dates";

import "react-loading-skeleton/dist/skeleton.css";

const PAGE_SIZE = 20;

/** The past-results windows: games from Eastern midnight this many days ago. */
const PAST_WINDOWS: Record<string, number> = { today: 0, yesterday: 1, last7days: 7, last30days: 30, last60days: 60 };

/** Played games in the current season or the season picked by the viewer. */
const ScoresPage: React.FC = () => {
  const { filter, setFilter } = useContext(FiltersContext);

  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState<number>(1); // 1-indexed
  const [totalPages, setTotalPages] = useState(0);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { currentSeason, pastSeasonIds, seasonLoading } = useSeason();
  const [pickedSeason, setPickedSeason] = useState<string | null>(null);
  const seasonId = pickedSeason ?? currentSeason?.id ?? null;
  const { viewer, loading: userLoading } = useSession();
  const signedIn = !!viewer;
  const sports = useSeasonDetail(signedIn ? seasonId : null)?.sports ?? [];

  // The college summary and sport filter follow the same season as the results.
  const collegeId = filter.college && filter.college !== "All" ? filter.college : null;
  const standings = useStandings(signedIn && collegeId ? seasonId : null);
  const collegeStats = standings.colleges.find((c) => c.id === collegeId) ?? null;
  const sportId = sports.find((sport) => sport.name === filter.sport)?.id;

  useEffect(() => {
    if (userLoading || !signedIn || !seasonId) return;
    const days = PAST_WINDOWS[filter.date];
    const now = new Date();
    setIsLoading(true);
    setFailed(false);
    window.scrollTo(0, 0);
    let live = true;
    fetchPlayedMatches({
      seasonId,
      collegeId: collegeId ?? undefined,
      sportId,
      from: days === undefined ? undefined : easternMidnight(addDays(easternDate(now), -days)).toISOString(),
      to: now.toISOString(),
      order: sortOrder,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(
        ({ items, total }) => {
          if (!live) return;
          setFilteredMatches(items);
          setTotalPages(Math.ceil(total / PAGE_SIZE));
        },
        (error) => {
          if (!live) return;
          console.error("Failed to fetch scores:", error);
          setFailed(true);
        }
      )
      .finally(() => live && setIsLoading(false));
    return () => {
      live = false;
    };
  }, [seasonId, page, collegeId, sportId, filter.date, sortOrder, userLoading, signedIn]);

  const handleSeasonChange = (nextSeason: string) => {
    if (nextSeason === seasonId) return;
    setPickedSeason(nextSeason);
    setPage(1);
    setIsLoading(true);
    setFilter((prev) => ({ ...prev, date: "AllPast", sport: "" }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1);
  };

  // Handle college click
  const handleCollegeClick = (collegeName: string) => {
    setFilter((prev) => ({ ...prev, college: collegeName }));
    setPage(1);
  };

  const handleSportClick = (sportName: string) => {
    setFilter((prev) => ({ ...prev, sport: sportName }));
    setPage(1);
  };

  const handleSortOrderChange = (newSortOrder: string) => {
    setSortOrder(newSortOrder === "asc" ? "asc" : "desc");
    setPage(1);
  };

  if (userLoading || (signedIn && seasonLoading)) {
    return <LoadingScreen />;
  }

  if (!signedIn) {
    return (
      <main className="flex flex-col mt-20 min-h-screen max-w-full mx-auto px-4">
        <PageHeading heading="Scores and Rankings" />
        <SignInPrompt message="Sign in to see scores and results." />
      </main>
    );
  }

  if (!currentSeason || !seasonId) {
    return (
      <main className="mt-20 min-h-screen">
        <PageHeading heading="Scores and Rankings" />
        <p className="p-4">Scores are unavailable.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col mt-20 justify-center max-w-full mx-auto">
      <PageHeading heading="Scores and Rankings" />
      <div className="flex items-center gap-2 px-2 mg:px-8 mp:px-20 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Season</span>
        <GlassDropdown
          placeholder="Season"
          value={seasonId}
          options={[
            { value: currentSeason.id, label: `${currentSeason.id} (Current)` },
            ...pastSeasonIds.map((id) => ({ value: id, label: id })),
          ]}
          onChange={handleSeasonChange}
          allowReset={false}
        />
      </div>
      {collegeId && (standings.loading || collegeStats) && (
        <>
          <div className="hidden xs:block">
            <CollegeSummaryCard
              stats={collegeStats}
              isLoading={standings.loading}
            />
          </div>
          <div className="block xs:hidden">
            <CollegeSummaryCardMobile
              stats={collegeStats}
              isLoading={standings.loading}
            />
          </div>
        </>
      )}

      <div className="w-full flex-col px-2 mg:px-8 mp:px-20">
        <TableHeader
          handleFilterChange={handleFilterChange}
          filter={filter}
          sports={sports}
          sortOrder={sortOrder}
          handleSortOrderChange={handleSortOrderChange}
        />
        {isLoading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : failed ? (
          <p role="alert" className="text-center mt-10">Couldn’t load scores for this season.</p>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center mt-10">
            <h1>No matches found!</h1>
            <br></br>
          </div>
        ) : (
          <>
            <MatchesTable
              filteredMatches={filteredMatches}
              sports={sports}
              handleCollegeClick={handleCollegeClick}
              handleSportClick={handleSportClick}
            />
            <Pagination currentPageNumber={page} totalPages={totalPages} setPageNumber={setPage} />
          </>
        )}
      </div>
    </main>
  );
};

export default ScoresPage;
