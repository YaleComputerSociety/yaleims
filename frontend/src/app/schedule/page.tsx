"use client";

import "react-calendar/dist/Calendar.css";
import { useState, useEffect } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import LoadingScreen from "@src/components/LoadingScreen";
import Filters from "../../components/Schedule/Filter";
import ListView from "../../components/Schedule/ListView";
import { toCollegeAbbreviation } from "@src/utils/helpers";
import Calendar from "@src/components/Schedule/Calendar";
import { FaSpinner } from "react-icons/fa"; // Example using Font Awesome spinner

const PAGE_SIZE = "10";

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

  const resetPaginationState = () => {
    setFilteredMatches([]);
    setHasMoreMatches(true);
    setLastVisible("");
    setChunksLoaded(0);
  };

  useEffect(() => {
    document.title = "Schedule";
  }, []);

  // fetch the next batch of matches
  useEffect(() => {
    const fetchMoreMatches = async () => {
      if (!hasMoreMatches) {
        return;
      }

      const params = new URLSearchParams({
        date: filter.date
          ? filter.date.toISOString()
          : new Date().toISOString(),
        pageSize: PAGE_SIZE,
        sport: filter.sport ? filter.sport : "",
        college: filter.college ? toCollegeAbbreviation[filter.college] : "",
        lastVisible: lastVisible ? lastVisible : "",
      }).toString();

      try {
        setIsLoadingMore(true);

        const response = await fetch(
          `https://us-central1-yims-125a2.cloudfunctions.net/getSchedulePaginated?${params}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching scores: ${response.statusText}`);
        }

        const data = await response.json();
        setFilteredMatches((prevMatches) => [...prevMatches, ...data.matches]); // append new matches to existing matches
        setLastVisible(data.lastVisible);
        setHasMoreMatches(data.hasMoreMatches);
      } catch (error) {
        console.error("Failed to fetch scores:", error);
      } finally {
        setIsLoadingMore(false);
        setIsFirstLoad(false);
      }
    };

    fetchMoreMatches();
  }, [filter.college, filter.date, filter.sport, chunksLoaded, hasMoreMatches, lastVisible]);

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
            Schedule
          </h1>

          {/* Main Layout */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 justify-center w-full max-w-7xl">
            {/* Filters and Calendar Section */}
            <div className="flex flex-col items-center lg:w-2/5">
              <Filters filter={filter} updateFilter={updateFilter} />
              <div className="sm:mt-6 w-full">
                <Calendar onClickDay={handleDateClick} />
              </div>
            </div>

            {/* ListView Section */}
            <div className="lg:w-3/5 flex flex-col items-center">
              {/* Scrollable ListView or No Matches Message */}
              {filteredMatches.length > 0 ? (
                <div className="sm:max-h-[700px] w-full sm:overflow-y-auto p-4 rounded-lg">
                  <ListView matches={filteredMatches} />
                </div>
              ) : (
                !isLoadingMore && (
                  <div className="text-center mt-8 text-gray-600">
                    No future matches found.
                  </div>
                )
              )}

              {/* Load More Button */}
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
      <br></br>
    </div>
  );
};

export default SchedulePage;
