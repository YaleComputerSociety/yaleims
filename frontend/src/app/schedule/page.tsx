"use client";

import "./calendar.css";
import "react-calendar/dist/Calendar.css";
import { useState, useEffect } from "react";
//import { matches } from "../../data/matches"; // Import your matches data
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { colleges } from "../../data/colleges";
import { sports } from "../../data/sports";
import LoadingScreen from "@src/components/LoadingScreen";
import { Match } from "../../data/matches";
import CalendarView from "../../components/Schedule/Calendar";
import ViewToggleButton from "../../components/Schedule/ViewToggleButton";
import Filters from "../../components/Schedule/Filter";
import ListView from "../../components/Schedule/ListView";
import SignUpModal from "../../components/Schedule/Signup";
import Calendar, { CalendarType } from "react-calendar";

const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"; // Replace with your actual client ID

const SchedulePage: React.FC = () => {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [signUpModalOpen, setSignUpModalOpen] = useState<boolean>(false);
  // const [filteredMatches, setFilteredMatches] = useState<Match[]>(
  //   //Object.values(matches)
  // );
  const [matches, setFilteredMatches] = useState<Match[]>([]);
  const [collegeFilter, setCollegeFilter] = useState<string>("");
  const [sportFilter, setSportFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState<Date | null>(null);

  const calendarType: CalendarType = "gregory";

  // change title of page
  useEffect(() => {
    document.title = "Schedule";

    // Get a selected college from session storage
    const selectedCollege = sessionStorage.getItem("selectedCollege");
    if (selectedCollege) {
      setCollegeFilter(selectedCollege);
    }
  }, []);

  // retrive data from firestore
  const fetchMatches = async () => {
    try {
      const response = await fetch('https://getmatches-65477nrg6a-uc.a.run.app'); // Replace with your actual Firebase function endpoint
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      //console.log('Score matches:', data); // Add this line
      return data;
    } catch (error) {
      console.error('Error fetching match data:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchMatches();
        console.log('Data2: ', data);
        setFilteredMatches(data);
      } catch (error) {
        console.error('Error fetching match data:', error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
  }, []);

  // Sort matches by date and apply filters
  useEffect(() => {
    // Display the loading screen
    setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Wait for 1 second and then hide the loading screen

    const sortedMatches = Object.values(matches).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const filtered = sortedMatches.filter((match) => {
      const matchDate = new Date(match.date + "T" + match.time);
      return (
        (collegeFilter === "" ||
          match.college1 === collegeFilter ||
          match.college2 === collegeFilter) &&
        (sportFilter === "" || match.sport === sportFilter) &&
        (date === null || matchDate >= date)
      );
    });

    setFilteredMatches(filtered);
  }, [collegeFilter, sportFilter, date]);

  // Google Login handler
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

  // Handle match click
  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setSignUpModalOpen(true);
  };

  // Calendar events from matches
  const calendarEvents = Object.values(matches).map((match) => ({
    title: `${match.college1} vs ${match.college2}`,
    start: new Date(`${match.date}T${match.time}`),
    end: new Date(`${match.date}T${match.time}`),
    match,
  }));

  // Toggle between list and calendar views
  const handleViewToggle = () => {
    setView(view === "list" ? "calendar" : "list");
  };

  // Function to handle sign-up
  const handleSignUp = () => {
    handleGoogleLogin();
  };

  // Function to handle date click
  const handleDateClick = (value: Date) => {
    setDate(value);
  };

  return (
    <div>
      {" "}
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <GoogleOAuthProvider clientId={CLIENT_ID}>
          <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-4xl font-bold text-center mb-8">Schedule</h1>

            {/* Toggle View Button */}
            <ViewToggleButton view={view} setView={setView} />

            {/* Filters */}
            <Filters
              collegeFilter={collegeFilter}
              setCollegeFilter={setCollegeFilter}
              sportFilter={sportFilter}
              setSportFilter={setSportFilter}
            />

            <div className="flex flex-col lg:flex-row gap-8">
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
              <div className="lg:w-1/2">
                <ListView
                  matches={matches}
                  onMatchClick={handleMatchClick}
                />
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
