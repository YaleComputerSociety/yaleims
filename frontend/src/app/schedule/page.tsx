"use client";

import { useState, useEffect } from "react";
import { matches } from "../../data/matches"; // Import your matches data
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { colleges } from '../../data/colleges';
import { sports } from '../../data/sports';
import LoadingScreen from '@src/components/LoadingScreen';
import { Match } from "../../data/matches";
import CalendarView from "../../components/Schedule/Calendar";
import ViewToggleButton from "../../components/Schedule/ViewToggleButton";
import Filters from "../../components/Schedule/Filter";
import ListView from "../../components/Schedule/ListView";
import SignUpModal from "../../components/Schedule/Signup";

const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"; // Replace with your actual client ID

const SchedulePage: React.FC = () => {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [signUpModalOpen, setSignUpModalOpen] = useState<boolean>(false);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>(
    Object.values(matches)
  );
  const [collegeFilter, setCollegeFilter] = useState<string>("");
  const [sportFilter, setSportFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // change title of page
  useEffect(() => {
    document.title = "Schedule";
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
      return (
        (collegeFilter === "" ||
          match.college1 === collegeFilter ||
          match.college2 === collegeFilter) &&
        (sportFilter === "" || match.sport === sportFilter)
      );
    });

    setFilteredMatches(filtered);
  }, [collegeFilter, sportFilter]);

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

  return (
    <div> {isLoading ? <LoadingScreen /> : (
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
          {/* List View or CalenderView */}
          {view === "list" ? (
              <ListView matches={filteredMatches} onMatchClick={handleMatchClick} />
            ) : (
              <CalendarView events={calendarEvents} onMatchClick={handleMatchClick} />
          )}

          {/* Sign-Up Modal */}
          {signUpModalOpen && selectedMatch && (<SignUpModal
              match={selectedMatch}
              onConfirm={handleGoogleLogin}
              onCancel={() => setSignUpModalOpen(false)}
          />)}
        </div>
      </GoogleOAuthProvider>)}
    </div>
  );
};

export default SchedulePage;
