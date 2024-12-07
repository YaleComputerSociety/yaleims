"use client";

import "./calendar.css";
import "react-calendar/dist/Calendar.css";
import { useState, useEffect } from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import "react-big-calendar/lib/css/react-big-calendar.css";
import LoadingScreen from "@src/components/LoadingScreen";
import Filters from "../../components/Schedule/Filter";
import ListView from "../../components/Schedule/ListView";
import SignUpModal from "../../components/Schedule/Signup";
import Calendar, { CalendarType } from "react-calendar";
import { toCollegeAbbreviation } from "@src/data/helpers"

const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";

const SchedulePage: React.FC = () => {
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [signUpModalOpen, setSignUpModalOpen] = useState<boolean>(false);
  const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
  const [filter, setFilter] = useState({
    college: "",
    sport: "",
    date: null as Date | null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const calendarType: CalendarType = "gregory";

  useEffect(() => {
    document.title = "Schedule";

    const selectedCollege = sessionStorage.getItem("selectedCollege");
    if (selectedCollege) {
      setFilter((prev) => ({ ...prev, college: selectedCollege }));
    }
  }, []);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await fetch(
          "https://us-central1-yims-125a2.cloudfunctions.net/getMatches?type=all",
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
        const filtered = data.filter((match: any) => {
          // Handle filtering
          const matchDate = match.timestamp ? new Date(match.timestamp) : null;
  
          // Safely resolve abbreviation
          const collegeAbbreviation : string = filter.college
            ? toCollegeAbbreviation[filter.college]
            : "";
  
          const collegeMatch = collegeAbbreviation
            ? [match.home_college, match.away_college].includes(collegeAbbreviation)
            : true;
  
          const sportMatch = filter.sport ? match.sport === filter.sport : true;
  
          const dateMatch =
            filter.date && matchDate
              ? matchDate.toDateString() === filter.date.toDateString()
              : true;
  
          return matchDate && collegeMatch && sportMatch && dateMatch;
        });
  
        setFilteredMatches(filtered);
      } catch (error) {
        console.error("Failed to fetch scores:", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchScores();
  }, [filter]); // Make sure to include filter as a dependency
  
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await fetch("/api/google-calendar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken: tokenResponse.access_token,
            match: selectedMatch,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          alert("Event added to your Google Calendar!");
        } else {
          alert("Failed to add event: " + data.error);
        }
      } catch (error) {
        console.error("Error:", error);
      }
      setSignUpModalOpen(false);
    },
    onError: () => {
      console.error("Google login failed");
    },
    scope: "https://www.googleapis.com/auth/calendar.events",
  });

  const handleMatchClick = (match: any) => {
    setSelectedMatch(match);
    setSignUpModalOpen(true);
  };

  const calendarEvents = filteredMatches
    .filter((match) => match.timestamp) // Exclude matches with null timestamps
    .map((match) => ({
      title: `${match.home_college} vs ${match.away_college}`,
      start: new Date(match.timestamp),
      end: new Date(match.timestamp),
      match,
    }));

  const updateFilter = (key: keyof typeof filter, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  const handleDateClick = (value: Date) => {
    setFilter((prev) => ({ ...prev, date: value }));
  };

  return (
    <div className="pt-8">
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <GoogleOAuthProvider clientId={CLIENT_ID}>
          <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-4xl font-bold text-center mb-8">Schedule</h1>
  
            {/* Filters */}
            <Filters
              filter={filter}
              updateFilter={updateFilter}
            />


  
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Calendar */}
              <div className="lg:w-1/2">
                <Calendar
                  locale="en-US"
                  calendarType={calendarType}
                  prev2Label={null}
                  next2Label={null}
                  selectRange={false}
                  showNeighboringMonth={true}
                  minDetail="month"
                  onClickDay={handleDateClick}
                />
              </div>
  
              {/* ListView or No Matches Message */}
              <div className="lg:w-1/2">
                {filteredMatches.length > 0 ? (
                  <ListView
                    matches={filteredMatches}
                    onMatchClick={handleMatchClick}
                  />
                ) : (
                  <div className="text-center mt-8 text-gray-600">
                    No matches found.
                  </div>
                )}
              </div>
            </div>
  
            {/* Sign-Up Modal */}
            {signUpModalOpen && selectedMatch && (
              <SignUpModal
                match={selectedMatch}
                onConfirm={handleGoogleLogin}
                onCancel={() => setSignUpModalOpen(false)}
              />
            )}
          </div>
        </GoogleOAuthProvider>
      )}
    </div>
  );
  
};

export default SchedulePage;
