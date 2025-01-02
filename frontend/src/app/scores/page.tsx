"use client";

import React, { useEffect, useState, useContext } from "react";
import LoadingScreen from "@src/components/LoadingScreen";
import CollegeSummaryCard from "@src/components/scores/CollegeSummaryCard";
import CollegeSummaryCardMobile from "@src/components/scores/CollegeSummaryCardMobile";
import { FiltersContext } from "@src/context/FiltersContext";
import TableHeader from "@src/components/scores/TableHeader";
import MatchesTable from "@src/components/scores/MatchTable";
import { Match, CollegeStats } from "@src/types/components";
import Pagination from "@src/components/scores/Pagination";

import "react-loading-skeleton/dist/skeleton.css";

// once this version is merged and deployed, we can delete the original getMatches cloud function

const ScoresPage: React.FC = () => {
  const filtersContext = useContext(FiltersContext);
  const { filter, setFilter } = filtersContext;

  // State for matches
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for college stats
  const [collegeStats, setCollegeStats] = useState<CollegeStats | null>(null);
  const [collegeIsLoading, setCollegeIsLoading] = useState(false);

  // State for pagination
  const [page, setPage] = useState<number>(1); // 1-indexed
  const [firstVisible, setFirstVisible] = useState<string>("");
  const [lastVisible, setLastVisible] = useState<string>("");
  const [queryType, setQueryType] = useState<string>("index");
  const [totalPages, setTotalPages] = useState<number>(10);

  const resetPaginationState = () => {
    setPage(1); // Reset page number when filter is changed
    setQueryType("index");
    setFirstVisible("");
    setLastVisible("");
  };

  // param types for fetching matches; doesn't yet support a date query
  const paramsIndex = new URLSearchParams({
    type: "index",
    pageIndex: page.toString(),
    pageSize: "20",
    college: filter.college ? filter.college : "All",
    sport: filter.sport ? filter.sport : "All",
  }).toString();

  const paramsNext = new URLSearchParams({
    type: "next",
    lastVisible: lastVisible,
    pageSize: "20",
    college: filter.college ? filter.college : "All",
    sport: filter.sport ? filter.sport : "All",
  }).toString();

  const paramsPrev = new URLSearchParams({
    type: "prev",
    firstVisible: firstVisible,
    pageSize: "20",
    college: filter.college ? filter.college : "All",
    sport: filter.sport ? filter.sport : "All",
  }).toString();

  const getParams = () => {
    if (queryType === "index") {
      return paramsIndex;
    } else if (queryType === "next") {
      return paramsNext;
    } else if (queryType === "prev") {
      return paramsPrev;
    } else {
      console.error("Invalid query type");
      return "";
    }
  };

  // fetch matches with pagination
  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://us-central1-yims-125a2.cloudfunctions.net/getMatchesPaginated?${getParams()}`
        );

        if (!response.ok) {
          throw new Error(`Error fetching scores: ${response.statusText}`);
        }

        const data = await response.json();

        setFilteredMatches(data.matches);
        setFirstVisible(data.firstVisible);
        setLastVisible(data.lastVisible);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error("Failed to fetch scores:", error);
      } finally {
        setIsLoading(false);
      }
    };

    window.scrollTo(0, 0); // scroll to top of page when data changes
    fetchMatches();
  }, [page, queryType, filter.college, filter.sport]); // Re-fetch matches when page or query type changes

  // Fetch college stats when the college filter changes
  useEffect(() => {
    const fetchCollegeStats = async () => {
      if (filter.college && filter.college !== "All") {
        setCollegeIsLoading(true);
        try {
          const response = await fetch(
            `https://us-central1-yims-125a2.cloudfunctions.net/getCollege?collegeId=${filter.college}`
          );
          if (!response.ok) {
            throw new Error(
              `Error fetching college stats: ${response.statusText}`
            );
          }

          const data = await response.json();
          setCollegeStats(data); // Update college stats
        } catch (error) {
          console.error("Failed to fetch college stats:", error);
        } finally {
          setCollegeIsLoading(false);
        }
      } else {
        setCollegeStats(null); // Reset stats if "All" is selected
      }
    };

    fetchCollegeStats();
  }, [filter.college]); // Re-fetch stats only when the college filter changes

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({
      ...prev,
      [name]: value,
    }));
    resetPaginationState();
  };

  // Handle college click
  const handleCollegeClick = (collegeName: string) => {
    setFilter((prev) => ({ ...prev, college: collegeName }));
    resetPaginationState();
  };

  useEffect(() => {
    console.log(filteredMatches);
  }, [filteredMatches]);

  return (
    <div className="min-h-screen p-8 flex-col items-center">
      <h1 className="md:text-4xl text-xl font-bold text-center mb-8 pt-8">
        Scores and Rankings
      </h1>

      {filter.college && filter.college != "All" && (
        <>
          <div className="hidden xs:block">
            <CollegeSummaryCard
              stats={collegeStats}
              isLoading={collegeIsLoading}
            />
          </div>
          <div className="block xs:hidden">
            <CollegeSummaryCardMobile
              stats={collegeStats}
              isLoading={collegeIsLoading}
            />
          </div>
        </>
      )}

      <div className="min-w-full flex-col items-center md:px-20">
        <TableHeader handleFilterChange={handleFilterChange} filter={filter} />
        {filteredMatches.length == 0 ? (
          <div className="text-center mt-10">
            <h1>No matches found!</h1>
          </div>
        ) : (
          <>
            <MatchesTable
              filteredMatches={filteredMatches}
              handleCollegeClick={handleCollegeClick}
            />
            <Pagination
              currentPageNumber={page}
              totalPages={totalPages}
              setPageNumber={setPage}
              setQueryType={setQueryType}
            />
          </>
        )}
      </div>
      {isLoading && <LoadingScreen />}
    </div>
  );
};

export default ScoresPage;
