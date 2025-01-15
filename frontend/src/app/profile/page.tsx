"use client";

import { useEffect, useState } from "react";
import { useUser } from "../../context/UserContext";
import Image from "next/image";
import { toCollegeAbbreviation } from "@src/utils/helpers"; // Ensure this import is correct
import { Match, Participant } from "@src/types/components";
import LoadingScreen from "@src/components/LoadingScreen";
import ListView from "@src/components/Profile/ListView";
import { MdModeEditOutline } from "react-icons/md";

const Profile = () => {
  const { user, loading, signOut, setUser } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [fetching, setFetching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [error, setError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [availablePoints, setAvailablePoints] = useState(0);

  const userEmail = user ? user.email : null;

  const cloudFunctionUrl = "https://getcollegematches-65477nrg6a-uc.a.run.app";

  useEffect(() => {
    const fetchUserMatches = async () => {
      if (!user || !user.email || matches.length > 0) return;

      setFetching(true);
      try {
        const userCollegeAbbreviation =
          toCollegeAbbreviation[user.college] || user.college;

        const response = await fetch(
          `${cloudFunctionUrl}?college=${userCollegeAbbreviation}&type=future&sortOrder=asc`,
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

        setMatches(fetchedMatches);
      } catch (error) {
        console.error("Error fetching user matches:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchUserMatches();
  }, [user, matches.length]);

  // Fetch user points
  useEffect(() => {
    if (!userEmail) return;

    const fetchMyPoints = async () => {
      try {
        const response = await fetch(
          `https://us-central1-yims-125a2.cloudfunctions.net/getMyAvailablePoints?email=${userEmail}`
        );
        if (!response.ok)
          throw new Error(`Error fetching points: ${response.statusText}`);
        const data = await response.json();
        setAvailablePoints(data.points);
      } catch (error) {
        console.error("Failed to fetch points:", error);
      }
    };

    fetchMyPoints();
  }, [userEmail]);

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

  const handleEditUsername = async () => {
    setEditLoading(true);
    setError("");

    try {
      console.log(user, user.username, newUsername);
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/updateUsername",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user?.email,
            newUsername: newUsername.trim(),
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("Username updated successfully:", data.username);
          // Update the user context
          setUser({
            ...user,
            username: data.username, // Update the username only
          });
          setIsEditing(false); // Close the popup
        } else {
          setError("Failed to update username. Please try again.");
        }
      } else {
        const errorMessage = await response.text();
        setError(errorMessage || "An unexpected error occurred.");
      }
    } catch (error) {
      console.error("Error updating username:", error);
      setError("Failed to update username. Please try again.");
    } finally {
      setEditLoading(false);
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
                <p className="text-md font-bold flex items-center">
                  Yodds Username: {user.username || "Anonymous"}
                  <MdModeEditOutline
                    className="ml-2 cursor-pointer hover:text-blue-700"
                    onClick={() => setIsEditing(true)}
                  />
                </p>

                <p className="text-md font-bold">
                  Games Played: {user.matches_played || 0}
                </p>
                <p className="text-md font-bold">
                  YCoins: {availablePoints || 0}
                </p>
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
                  No available games to sign up for this week.
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
      {isEditing && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4">Edit Username</h2>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 mb-4"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEditUsername(); // Trigger the function on Enter key press
                }
              }}
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex justify-end space-x-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                onClick={handleEditUsername}
                disabled={editLoading}
              >
                {editLoading ? "Saving..." : "Save"}
              </button>
              <button
                className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <br></br>
      <br></br>
      <br></br>
    </div>
  );
};

export default Profile;
