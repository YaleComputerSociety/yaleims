"use client";

import { useState, useEffect } from "react";
import { matches } from "../../data/matches"; // Import your matches data
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { colleges } from '../../data/colleges';
import { sports } from '../../data/sports';
import LoadingScreen from '@src/components/LoadingScreen';
import { Match } from "../../data/matches";

const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"; // Replace with your actual client ID
const localizer = momentLocalizer(moment);

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
          <div className="text-center mb-8">
            <button
              onClick={handleViewToggle}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              {view === "list" ? "Switch to Calendar View" : "Switch to List View"}
            </button>
          </div>

          {/* Filters */}
          <div className="flex justify-center space-x-4 mb-8">
            <div>
              <label className="block text-lg font-bold mb-2">Filter by College</label>
              <select
                value={collegeFilter}
                onChange={(e) => setCollegeFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg w-48"
              >
                <option value="">All Colleges</option>
                {Object.values(colleges).map((college) => (
                  <option key={college.id} value={college.name}>
                    {college.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-lg font-bold mb-2">Filter by Sport</label>
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg w-48"
              >
                <option value="">All Sports</option>
                {Object.values(sports).map((sport) => (
                  <option key={sport.id} value={sport.name}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List View */}
          {view === "list" && (
            <ul className="space-y-4">
              {filteredMatches.map((match, index) => (
                <li key={index} className="bg-white shadow-lg p-6 rounded-lg hover:shadow-xl transition duration-300 ease-in-out">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold mb-1 text-gray-900">
                        {match.college1} <span className="text-green-500">vs</span> {match.college2}
                      </div>
                      <div className="text-gray-600 font-semibold">{match.sport}</div>
                      <div className="text-gray-500">{match.date} at {match.time}</div>
                      <div className="text-gray-500">Location: {match.location}</div>
                    </div>
                    <button
                      onClick={() => handleMatchClick(match)}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 focus:outline-none transition duration-300 ease-in-out"
                    >
                      Sign Up
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Calendar View */}
          {view === "calendar" && (
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 500 }}
              onSelectEvent={(event) => handleMatchClick(event.match)}
            />
          )}

          {/* Sign-Up Modal */}
          {signUpModalOpen && selectedMatch && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
              <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
                <h2 className="text-2xl font-bold mb-4">Sign Up for Match</h2>
                <p>
                  {selectedMatch.college1} vs {selectedMatch.college2} <br />
                  {selectedMatch.sport} <br />
                  {selectedMatch.date} at {selectedMatch.time} <br />
                  Location: {selectedMatch.location}
                </p>
                <button
                  onClick={handleSignUp}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg"
                >
                  Confirm Sign-Up
                </button>
                <button
                  onClick={() => setSignUpModalOpen(false)}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </GoogleOAuthProvider>

    ) }</div>

  );
};

export default SchedulePage;
