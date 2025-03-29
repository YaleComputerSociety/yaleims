"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "../../components/LoadingScreen";
import Filters from "../../components/Schedule/Filter";
import ListView from "../../components/Schedule/ListView";
import Calendar from "../../components/Schedule/Calendar";
import { FaSpinner } from "react-icons/fa";
import { toCollegeAbbreviation, toCollegeName } from "@src/utils/helpers";

const PAGE_SIZE = "10";

// TODO: calendar focus changes on scroll
// PLAN:
//  - move the selected date state to this component, pass into calendar component
//  - top element component in here, pass into ListView
//  - IntersectionObserver to detect what the top element is in view; update selected date state

const SchedulePage: React.FC = () => {
  const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
  const [filter, setFilter] = useState({
    college: "",
    sport: "",
    date: new Date(),
  });

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<string>("");
  const [hasMoreMatches, setHasMoreMatches] = useState(true);
  const [chunksLoaded, setChunksLoaded] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // state for calendar focus circle
  const [topDate, setTopDate] = useState(new Date());

  // Parse URL search parameters manually
  useEffect(() => {
    const params = new URLSearchParams(window.location.search); // Use `window.location.search`
    const college = params.get("college");
    if (college) {
      setFilter((prev) => ({
        ...prev,
        college: toCollegeName[college] || "",
      }));
    }
  }, []); // Runs only once when the component mounts

  const resetPaginationState = () => {
    setFilteredMatches([]);
    setHasMoreMatches(true);
    setLastVisible("");
    setChunksLoaded(0);
  };

  const fetchMoreMatches = async () => {
    if (!hasMoreMatches) return;

    const params = new URLSearchParams({
      date: filter.date.toISOString(),
      pageSize: PAGE_SIZE,
      sport: filter.sport || "",
      college: filter.college ? toCollegeAbbreviation[filter.college] : "",
      lastVisible: lastVisible || "",
    }).toString();

    try {
      setIsLoadingMore(true);

      const response = await fetch(
        `https://us-central1-yims-125a2.cloudfunctions.net/getSchedulePaginated?${params}`
      );

      if (!response.ok) {
        throw new Error(`Error fetching matches: ${response.statusText}`);
      }

      const data = await response.json();
      setFilteredMatches((prev) => [...prev, ...data.matches]);
      setLastVisible(data.lastVisible);
      setHasMoreMatches(data.hasMoreMatches);
    } catch (error) {
      console.error("Failed to fetch matches:", error);
    } finally {
      setIsLoadingMore(false);
      setIsFirstLoad(false);
    }
  };

  useEffect(() => {
    fetchMoreMatches();
  }, [filter, chunksLoaded]);

  const updateFilter = (key: keyof typeof filter, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
    resetPaginationState();
  };

  const handleDateClick = (value: Date) => {
    setFilter((prev) => ({ ...prev, date: value }));
    resetPaginationState();
  };

  const handleLoadMoreClick = () => {
    setChunksLoaded(chunksLoaded + 1);
  };

  return (
    <div className="pt-8">
      {isFirstLoad ? (
        <LoadingScreen />
      ) : (
        <div className="p-4 flex flex-col items-center">
          <h1 className="text-2xl sm:text-4xl font-bold text-center mb-4 xs:mb-8">
            Schedules
          </h1>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 justify-center w-full max-w-7xl">
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
                <div className="sm:max-h-[700px] w-full sm:overflow-y-auto p-4 rounded-lg">
                  <ListView
                    matches={filteredMatches}
                    topDate={topDate}
                    setTopDate={setTopDate}
                  />
                </div>
              ) : (
                <div className="text-center mt-8 text-gray-600">
                  No future matches found.
                </div>
              )}
              {hasMoreMatches && (
                <div className="w-full flex justify-center mt-4">
                  {!isLoadingMore ? (
                    <button
                      className="bg-blue-600 text-white p-3 rounded-lg"
                      onClick={handleLoadMoreClick}
                    >
                      Load More Matches
                    </button>
                  ) : (
                    <div className="flex flex-row items-center justify-center space-x-2">
                      <span>Loading</span>
                      <FaSpinner className="animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
