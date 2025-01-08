"use client";

import { useEffect, useState } from "react";
import { useUser } from "../../context/UserContext";
import ListView from "../../components/profile/ListView";
import Image from "next/image";
import { toCollegeAbbreviation } from "@src/utils/helpers"; // Ensure this import is correct
import { Match, Participant } from "@src/types/components";
import LoadingScreen from "@src/components/LoadingScreen";

const Profile = () => {
  const { user, loading, signOut } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [fetching, setFetching] = useState(false);

  const cloudFunctionUrl = "https://getcollegematches-65477nrg6a-uc.a.run.app";

  useEffect(() => {
    const fetchUserMatches = async () => {
      if (!user || !user.email || matches.length > 0) return;

      setFetching(true);
      try {
        const userCollegeAbbreviation =
          toCollegeAbbreviation[user.college] || user.college;

        const response = await fetch(
          `${cloudFunctionUrl}?college=${userCollegeAbbreviation}&type=future`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching matches: ${response.statusText}`);
        }

        const fetchedMatches: Match[] = await response.json();

        const futureMatches = fetchedMatches.filter((match) => {
          const matchDate = new Date(match.timestamp);
          return matchDate > new Date();
        });

        setMatches(futureMatches);
      } catch (error) {
        console.error("Error fetching user matches:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchUserMatches();
  }, [user, matches.length]);

  const signedUpMatches = matches.filter((match) => {
    const homeParticipants = match.home_college_participants || [];
    const awayParticipants = match.away_college_participants || [];

    return (
      homeParticipants.some(
        (participant: Participant) => participant.email === user?.email
      ) ||
      awayParticipants.some(
        (participant: Participant) => participant.email === user?.email
      )
    );
  });

  const availableMatches = matches.filter((match) => {
    const homeParticipants = match.home_college_participants || [];
    const awayParticipants = match.away_college_participants || [];

    return (
      !homeParticipants.some(
        (participant) => participant.email === user?.email
      ) &&
      !awayParticipants.some((participant) => participant.email === user?.email)
    );
  });

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

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading || fetching) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-500">
        <span>User not signed in</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[80vh]">
      <div className="flex-grow m-3">
        <div className="max-w-6xl mx-auto p-6 m-4 rounded-lg flex flex-col space-y-6 lg:flex-row lg:space-y-0 lg:space-x-6">
          {/* Right Side: Stats */}
          <div className="flex justify-center items-center flex-col space-y-6 lg:w-1/2 order-1 lg:order-2">
            <div className="p-6 border bg-white dark:bg-black border-black dark:border-white rounded-lg space-y-4 flex justify-center items-center flex-col">
              <h2 className="text-2xl font-semibold">Your 2025 Stats Box!</h2>
              <div className="flex items-center space-x-4">
                <Image
                  src={`/college_flags/${user.college}.png`}
                  alt={user.college}
                  width={100}
                  height={100}
                  className="rounded-md object-contain"
                />
              </div>
              <h2 className="text-2xl font-semibold">{user.name}</h2>
              <div className="space-y-2 flex items-center flex-col space-y-2">
                <p className="text-md font-bold">
                  Games Played: {user.matches_played}
                </p>
                <p className="text-md font-bold">Coins: {user.points}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-6 py-2 px-4 bg-red-500 text-white rounded-md"
            >
              Log Out
            </button>
          </div>

          {/* Left Side */}
          <div className="flex flex-col space-y-6 lg:w-1/2 order-2 lg:order-1">
            <div className="flex flex-col space-y-2">
              <div className="text-xl font-semibold mb-2">
                Your Upcoming Games
              </div>
              {signedUpMatches.length > 0 ? (
                <div className="w-full">
                  <ListView
                    matches={signedUpMatches}
                    signUp={signUp}
                    unregister={unregister}
                  />
                </div>
              ) : (
                <div className="text-center mt-8 text-gray-600">
                  No upcoming games found.
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <div className="text-xl font-semibold mb-2">Sign Up Today</div>
              {availableMatches.length > 0 ? (
                <div className="w-full">
                  <ListView
                    matches={availableMatches}
                    signUp={signUp}
                    unregister={unregister}
                  />
                </div>
              ) : (
                <div className="text-center mt-8 text-gray-600">
                  No available games to sign up for.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
