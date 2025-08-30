"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "@src/components/LoadingScreen";
import Filters from "@src/components/Schedule/Filter";
import ListView from "@src/components/Schedule/ListView";
import Calendar from "@src/components/Schedule/Calendar";
import { FaSpinner } from "react-icons/fa";
import { toCollegeAbbreviation, toCollegeName } from "@src/utils/helpers";
import PageHeading from "@src/components/PageHeading";
import { useSeason } from "@src/context/SeasonContext";
import { Match } from "@src/types/components";
import Pagination from "@src/components/Scores/Pagination";
import { toast } from "react-toastify";

const PAGE_SIZE = "10";

const SchedulePage: React.FC = () => {
  const [filter, setFilter] = useState({
    college: "",
    sport: "",
    date: new Date()
  });

  const [page, setPage] = useState<number>(1);
  const [firstVisible, setFirstVisible] = useState<string>("");
  const [lastVisible, setLastVisible] = useState<string>("");
  const [queryType, setQueryType] = useState<string>("index");
  const [totalPages, setTotalPages] = useState<number>(10);
  const [sortOrder] = useState<string>("asc");
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {currentSeason} = useSeason()

  const resetPaginationState = () => {
    setPage(1); // Reset page number when filter is changed
    setQueryType("index");
    setFirstVisible("");
    setLastVisible("");
  };

  const getQueryParams = (type: string) => {
    const baseParams = {
      type: "index",
      pageSize: PAGE_SIZE,
      sortOrder: sortOrder,
      college: filter.college ? toCollegeAbbreviation[filter.college] : "All",
      date: filter.date.toISOString(),
      sport: filter.sport ? filter.sport : "All",
    };

    if (type === "next" && lastVisible) {
      return { ...baseParams, type, lastVisible };
    }
    if (type === "prev" && firstVisible) {
      return { ...baseParams, type, firstVisible };
    }
    if (type === "index") {
      return { ...baseParams, pageIndex: page.toString() };
    }

    return baseParams;
  };

  // Fetch matches with pagination
  useEffect(() => {
    const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const currentDate = new Date();
      const params = new URLSearchParams(getQueryParams(queryType));
      const dateParam = params.get("date");
      const yesterday = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate() - 1
        );
      if (dateParam && new Date(dateParam) <= yesterday) {
        toast.error("Cannot signUp for past matches.");
        return;
      }
        const response = await fetch(`/api/functions/getMatches?${params}&seasonId=${currentSeason?.year || "2025-2026"}`);
        if (!response.ok) throw new Error(`Error fetching matches: ${response.statusText}`);

        const data = await response.json();
        setFilteredMatches(data.matches);
        
        if (data.firstVisible) setFirstVisible(data.firstVisible);
        if (data.lastVisible) setLastVisible(data.lastVisible);
        if (data.totalPages) setTotalPages(data.totalPages);
        
      } catch (error) {
        console.error("Failed to fetch matches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    window.scrollTo(0, 0);
    fetchMatches();
  }, [page, queryType, filter]);

  // state for calendar focus circle
  const [topDate, setTopDate] = useState(new Date());

  const updateFilter = (key: keyof typeof filter, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
    resetPaginationState();
  };

  const handleDateClick = (value: any) => {
    setFilter((prev) => ({ ...prev, date: value }));
    resetPaginationState();
  };

  return (
    <div className="pt-20">
        <div className="p-4 min-h-screen flex flex-col items-center">
          <PageHeading heading="Schedules" />

          <div className="flex items-center flex-col lg:flex-row gap-8 lg:gap-16 justify-center w-full max-w-7xl transition-all duration-300">
            {/* Filters and Calendar */}
            <div className="flex flex-col items-center lg:w-2/5">
              <Filters filter={filter} updateFilter={updateFilter} />
              <Calendar
                onClickDay={handleDateClick}
                selectedDate={topDate}
                setSelectedDate={setTopDate}
              />
            </div>
            <div className="lg:w-3/5 flex flex-col items-center">
              {filteredMatches.length > 0 ? (
                <div className="flex flex-col">
                  <div className="justify-center h-[500px] overflow-y-auto">
                    <ListView
                    matches={filteredMatches}
                    topDate={topDate}
                    setTopDate={setTopDate}
                    />
                  </div>
                  <Pagination
                    currentPageNumber={page}
                    totalPages={totalPages}
                    setPageNumber={setPage}
                    setQueryType={setQueryType}
                  />
                </div>
              ) : (
                <div className="text-center text-gray-600">
                  No future matches found.
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};

export default SchedulePage;
