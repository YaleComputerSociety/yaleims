"use client";

import { useEffect, useState } from "react";
import { useUser } from "../../context/UserContext";
import Image from "next/image";
import { toCollegeAbbreviation } from "@src/utils/helpers"; // Ensure this import is correct
import { Match, Participant } from "@src/types/components";
import LoadingScreen from "@src/components/LoadingScreen";
import ListView from "@src/components/Profile/ListView";

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
        (participant: Participant) => participant.email === user?.email
      ) &&
      !awayParticipants.some(
        (participant: Participant) => participant.email === user?.email
      )
    );
  });

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
    <div className="flex flex-col max-w-[1500px] mx-auto">
      <div className="flex-grow m-3 ">
        <h2 className="text-lg sm:text-2xl font-semibold text-center mt-10">
          Hey {user.name.split(" ")[0]}, play some IMs today!
        </h2>
        <div className="mx-auto p-6 m-4 rounded-lg flex flex-col space-y-6 lg:items-start lg:flex-row lg:space-y-0 lg:space-x-6 justify-center lg:ml-10">
          {/* Right Side: Stats */}
          <div className="flex justify-center items-center flex-col space-y-6 lg:w-2/5 order-1 lg:order-2">
            <div className="p-6  bg-white dark:bg-black shadow-lg rounded-lg space-y-4 flex justify-center flex-col">
              <h2 className="text-lg sm:text-2xl font-semibold text-center">
                Your 2025 Stats Box!
              </h2>
              <div className="flex justify-center items-center space-x-4">
                <Image
                  src={`/college_flags/${user.college}.png`}
                  alt={user.college}
                  width={100}
                  height={100}
                  className="rounded-md object-contain"
                />
              </div>
              <div className="flex items-center flex-col">
                <p className="text-md font-bold">
                  Games Played: {user.matches_played || 0}
                </p>
                <p className="text-md font-bold">Coins: {user.points}</p>
              </div>
            </div>

            <div className="hidden sm:block">
              <button
                onClick={handleLogout}
                className="mt-6 py-2 px-4 bg-red-500 text-white rounded-md"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Left Side */}
          <div className="flex flex-col space-y-6 lg:w-3/5 order-2 lg:order-1">
            <div className="flex flex-col space-y-2">
              <div className="text-xl font-semibold mb-2">
                Your Upcoming Games
              </div>
              {signedUpMatches.length > 0 ? (
                <div className="w-full">
                  <ListView matches={signedUpMatches} isSignedUp={true} />
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
                  <ListView matches={availableMatches} isSignedUp={false} />
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
      <div className="sm:hidden text-center">
        <button
          onClick={handleLogout}
          className="mt-6 py-2 px-4 bg-red-500 text-white rounded-md"
        >
          Log Out
        </button>
      </div>
      <br></br>
      <br></br>
      <br></br>
    </div>
  );
};

export default Profile;
