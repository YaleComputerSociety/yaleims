"use client";

import "react-calendar/dist/Calendar.css";
import { useState, useEffect } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import LoadingScreen from "@src/components/LoadingScreen";
import Filters from "../../components/schedule/Filter";
import ListView from "../../components/schedule/ListView";
import { useUser } from "../../context/UserContext";
import { toCollegeAbbreviation } from "@src/utils/helpers";
import { Match } from "@src/types/components";
import Calendar from "@src/components/schedule/Calendar";
import { FaSpinner } from "react-icons/fa"; // Example using Font Awesome spinner

const PAGE_SIZE = "10";

const SchedulePage: React.FC = () => {
  const { user } = useUser(); // Use already fetched user data
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

  console.log("hello");

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

        setFilteredMatches((prevMatches) => {
          const matchIds = new Set(prevMatches.map((match) => match.id));
          const uniqueMatches = data.matches.filter(
            (match: Match) => !matchIds.has(match.id)
          );
          return [...prevMatches, ...uniqueMatches];
        });
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
  }, [filter.college, filter.date, filter.sport, chunksLoaded]);

  // fetch new matches on filter change

  // signup and register (redundant code) DEFINED SAME AS IN SCHEDULES PAGE
  const signUp = async (selectedMatch: Match) => {
    try {
      // Construct the matchId based on home_college, away_college, and timestamp
      if (
        !selectedMatch ||
        !selectedMatch.home_college ||
        !selectedMatch.away_college ||
        !selectedMatch.timestamp
      ) {
        console.error("Missing fields in selectedMatch:", selectedMatch);
        alert("Unable to proceed: Missing match details.");
        return;
      }
      const matchId = `${selectedMatch.home_college}-${selectedMatch.away_college}-${selectedMatch.timestamp}`;

      /** Add user to the appropriate participant array and update their matches **/
      const userCollegeAbbreviation = toCollegeAbbreviation[user.college] || "";

      // Ensure user college abbreviation matches home/away college
      const isHomeCollege =
        selectedMatch.home_college === userCollegeAbbreviation;
      const isAwayCollege =
        selectedMatch.away_college === userCollegeAbbreviation;

      if (isHomeCollege || isAwayCollege) {
        const participantType = isHomeCollege
          ? "home_college_participants"
          : "away_college_participants";

        const cloudFunctionUrl =
          "https://addparticipant-65477nrg6a-uc.a.run.app"; // Cloud function URL

        const cloudFunctionResponse = await fetch(cloudFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId, // Use constructed matchId
            participantType, // Send participantType
            user, // Send entire user object
            selectedMatch, // Send selectedMatch to add to user's matches
          }),
        });

        const cloudFunctionData = await cloudFunctionResponse.json();
        if (!cloudFunctionResponse.ok) {
          console.error("Error:", cloudFunctionData.error);
          alert(`Error: ${cloudFunctionData.error}`);
        }
      } else {
        console.warn(
          `Your college (${user.college}) does not match home or away college for this match.`
        );
        alert(
          "Your college does not match the home or away college for this match."
        );
      }
    } catch (error) {
      console.error("Error:", error);
      alert(
        "An error occurred while processing your request. Please try again."
      );
    }
  };

  const unregister = async (selectedMatch: Match) => {
    try {
      // Construct the matchId based on home_college, away_college, and timestamp
      if (
        !selectedMatch ||
        !selectedMatch.home_college ||
        !selectedMatch.away_college ||
        !selectedMatch.timestamp
      ) {
        console.error("Missing fields in selectedMatch:", selectedMatch);
        alert("Unable to proceed: Missing match details.");
        return;
      }
      const matchId = `${selectedMatch.home_college}-${selectedMatch.away_college}-${selectedMatch.timestamp}`;

      const userCollegeAbbreviation = toCollegeAbbreviation[user.college] || "";

      // Ensure user college abbreviation matches home/away college
      const isHomeCollege =
        selectedMatch.home_college === userCollegeAbbreviation;
      const isAwayCollege =
        selectedMatch.away_college === userCollegeAbbreviation;

      if (isHomeCollege || isAwayCollege) {
        const participantType = isHomeCollege
          ? "home_college_participants"
          : "away_college_participants";

        const cloudFunctionUrl =
          "https://removeparticipant-65477nrg6a-uc.a.run.app"; // Cloud function URL

        const cloudFunctionResponse = await fetch(cloudFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId, // Use constructed matchId
            participantType, // Send participantType
            user, // Send entire user object
            selectedMatch, // Send selectedMatch to remove from user's matches
          }),
        });

        const cloudFunctionData = await cloudFunctionResponse.json();
        if (!cloudFunctionResponse.ok) {
          console.error("Error:", cloudFunctionData.error);
          alert(`Error: ${cloudFunctionData.error}`);
        }
      } else {
        console.warn(
          `Your college (${user.college}) does not match home or away college for this match.`
        );
        alert(
          "Your college does not match the home or away college for this match."
        );
      }
    } catch (error) {
      console.error("Error:", error);
      alert(
        "An error occurred while processing your request. Please try again."
      );
    }
  };

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
        <div className="min-h-screen p-8 flex flex-col items-center">
          <h1 className="text-4xl font-bold text-center mb-8">Schedule</h1>

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
              {/* Title with Selected Date */}
              {filteredMatches.length > 0 && (
                <h2 className="text-2xl font-semibold mb-4">
                  <span>
                    {filter.date.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </h2>
              )}

              {/* Scrollable ListView or No Matches Message */}
              {filteredMatches.length > 0 ? (
                <div className="max-h-[700px] w-full overflow-y-auto p-4 rounded-lg">
                  <ListView
                    matches={filteredMatches}
                    signUp={signUp}
                    unregister={unregister}
                  />
                </div>
              ) : (
                !isLoadingMore && (
                  <div className="text-center mt-8 text-gray-600">
                    No matches found.
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
    </div>
  );
};

export default SchedulePage;
