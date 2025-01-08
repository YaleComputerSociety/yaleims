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

const ScoresPage: React.FC = () => {
  const filtersContext = useContext(FiltersContext);
  console.log(filtersContext);
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
  const [sortOrder, setSortOrder] = useState<string>("desc");

  const resetPaginationState = () => {
    setPage(1); // Reset page number when filter is changed
    setQueryType("index");
    setFirstVisible("");
    setLastVisible("");
  };

  // param types for fetching matches
  const paramsIndex = new URLSearchParams({
    type: "index",
    pageIndex: page.toString(),
    pageSize: "20",
    college: filter.college ? filter.college : "All",
    sport: filter.sport ? filter.sport : "All",
    date: filter.date ? filter.date : "All",
    sortOrder: sortOrder ? sortOrder : "desc",
  }).toString();

  const paramsNext = new URLSearchParams({
    type: "next",
    lastVisible: lastVisible,
    pageSize: "20",
    college: filter.college ? filter.college : "All",
    sport: filter.sport ? filter.sport : "All",
    date: filter.date ? filter.date : "All",
    sortOrder: sortOrder ? sortOrder : "desc",
  }).toString();

  const paramsPrev = new URLSearchParams({
    type: "prev",
    firstVisible: firstVisible,
    pageSize: "20",
    college: filter.college ? filter.college : "All",
    sport: filter.sport ? filter.sport : "All",
    date: filter.date ? filter.date : "All",
    sortOrder: sortOrder ? sortOrder : "desc",
  }).toString();

  // fetch matches with pagination
  useEffect(() => {
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

        console.log(data);

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

    window.scrollTo(0, 0);
    fetchMatches();
  }, [page, queryType, filter.college, filter.sport, filter.date, sortOrder]);

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

  const handleSportClick = (sportName: string) => {
    setFilter((prev) => ({ ...prev, sport: sportName }));
    resetPaginationState();
  };

  const handleSortOrderChange = (newSortOrder: string) => {
    setSortOrder(newSortOrder);
    resetPaginationState();
  };

  return (
    <div className="p-4 flex flex-col justify-center max-w-[1500px] mx-auto">
      <h1 className="md:text-4xl text-xl font-bold text-center xs:mb-4 pt-8">
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

      <div className="min-w-full flex-col md:px-20">
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
