"use client";

import React, { useEffect, useState, useContext } from "react";
import LoadingScreen from "@/components/layout/LoadingScreen";
import CollegeSummaryCard from "@/components/scores/CollegeSummaryCard";
import CollegeSummaryCardMobile from "@/components/scores/CollegeSummaryCardMobile";
import { FiltersContext } from "@/context/FiltersContext";
import TableHeader from "@/components/scores/TableHeader";
import MatchesTable from "@/components/scores/MatchTable";
import Pagination from "@/components/ui/Pagination";
import PageHeading from "@/components/layout/PageHeading";
import { useSeason } from "@/context/SeasonContext";
import { useUser } from "@/context/UserContext";
import { useStandings } from "@/hooks/useStandings";
import SignInPrompt from "@/components/layout/SignInPrompt";
import { fetchPlayedMatches, type Match } from "@/lib/api/matches";
import { addDays, easternDate, easternMidnight } from "@/lib/dates";

import "react-loading-skeleton/dist/skeleton.css";

const PAGE_SIZE = 20;

/** The past-results windows: games from Eastern midnight this many days ago. */
const PAST_WINDOWS: Record<string, number> = { today: 0, yesterday: 1, last7days: 7, last30days: 30, last60days: 60 };

/** Played games of every season, newest first, a page at a time (signed in, as today). */
const ScoresPage: React.FC = () => {
  const { filter, setFilter } = useContext(FiltersContext);

  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState<number>(1); // 1-indexed
  const [totalPages, setTotalPages] = useState<number>(10);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { currentSeason } = useSeason();
  const { user, loading: userLoading } = useUser();
  const signedIn = !!user;

  // The selected college's standing this season (live).
  const collegeId = filter.college && filter.college !== "All" ? filter.college : null;
  const standings = useStandings(collegeId && currentSeason ? currentSeason.id : null);
  const collegeStats = standings.colleges.find((c) => c.id === collegeId) ?? null;
  // Sport ids are the same every season; the filter names the sport.
  const sportId = currentSeason?.sports.find((sport) => sport.name === filter.sport)?.id;

  useEffect(() => {
    if (userLoading) return;
    if (!signedIn) {
      setIsLoading(false);
      return;
    }
    const days = PAST_WINDOWS[filter.date];
    const now = new Date();
    setIsLoading(true);
    window.scrollTo(0, 0);
    let live = true;
    fetchPlayedMatches({
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
        (error) => console.error("Failed to fetch scores:", error)
      )
      .finally(() => live && setIsLoading(false));
    return () => {
      live = false;
    };
  }, [page, collegeId, sportId, filter.date, sortOrder, userLoading, signedIn]);

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

  if (isLoading || userLoading) {
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

  return (
    <main className="flex flex-col mt-20 justify-center max-w-full mx-auto">
      <PageHeading heading="Scores and Rankings" />
      {filter.college && filter.college != "All" && (
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
          sortOrder={sortOrder}
          handleSortOrderChange={handleSortOrderChange}
        />
        {filteredMatches.length == 0 ? (
          <div className="text-center mt-10">
            <h1>No matches found!</h1>
            <br></br>
          </div>
        ) : (
          <>
            <MatchesTable
              filteredMatches={filteredMatches}
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
