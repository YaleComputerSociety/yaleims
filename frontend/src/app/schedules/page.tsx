"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "@/components/layout/LoadingScreen";
import Filters from "@/components/schedules/Filter";
import ListView from "@/components/schedules/ListView";
import Calendar from "@/components/schedules/Calendar";
import PageHeading from "@/components/layout/PageHeading";
import { useSeason } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import SignInPrompt from "@/components/layout/SignInPrompt";
import Pagination from "@/components/ui/Pagination";
import { fetchSeasonMatches, type Match } from "@/lib/api/matches";
import { COLLEGES } from "@/lib/colleges";
import { toast } from "react-toastify";

const PAGE_SIZE = 10;

/** The current season's games still to be played, from a day on, a page at a time. */
const SchedulePage: React.FC = () => {
  const [filter, setFilter] = useState({
    college: "",
    sport: "",
    date: new Date()
  });

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(10);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);

  const { currentSeason } = useSeason();
  // The schedule is for signed-in users (D42 Q6: as today).
  const { viewer, loading: userLoading } = useSession();
  const signedIn = !!viewer;

  useEffect(() => {
    if (userLoading || !signedIn || !currentSeason) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    if (filter.date <= yesterday) {
      toast.error("Cannot signUp for past matches.");
      return;
    }
    window.scrollTo(0, 0);
    let live = true;
    fetchSeasonMatches(currentSeason.id, {
      status: "scheduled",
      from: filter.date.toISOString(),
      collegeId: COLLEGES.find((c) => c.name === filter.college)?.id,
      sportId: currentSeason.sports.find((sport) => sport.name === filter.sport)?.id,
      page,
      pageSize: PAGE_SIZE,
    }).then(
      ({ items, total }) => {
        if (!live) return;
        setFilteredMatches(items);
        if (total) setTotalPages(Math.ceil(total / PAGE_SIZE));
      },
      (error) => console.error("Failed to fetch matches:", error)
    );
    return () => {
      live = false;
    };
  }, [page, filter, currentSeason, userLoading, signedIn]);

  // state for calendar focus circle
  const [topDate, setTopDate] = useState(new Date());

  const updateFilter = (key: keyof typeof filter, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleDateClick = (value: Date) => {
    setFilter((prev) => ({ ...prev, date: value }));
    setPage(1);
  };

  if (userLoading) {
    return <LoadingScreen />;
  }

  if (!signedIn) {
    return (
      <div className="pt-20">
        <div className="p-4 min-h-screen flex flex-col items-center">
          <PageHeading heading="Schedules" />
          <SignInPrompt message="Sign in to see the schedule and sign up for games." />
        </div>
      </div>
    );
  }

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
                  <Pagination currentPageNumber={page} totalPages={totalPages} setPageNumber={setPage} />
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
