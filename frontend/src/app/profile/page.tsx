"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useSeason } from "@/context/SeasonContext";
import Image from "next/image";
import LoadingScreen from "@/components/layout/LoadingScreen";
import ListView from "@/components/profile/ListView";
import CollegeAffiliation from "@/components/profile/CollegeAffiliation";
import { MdModeEditOutline } from "react-icons/md";
import Link from "next/link";
import { getCollegeFlag } from "@/lib/images";
import SignInPrompt from "@/components/layout/SignInPrompt";
import { fetchSeasonMatches, type Match } from "@/lib/api/matches";
import { changeMe, fetchMyMatches } from "@/lib/api/me";
import { collegeName } from "@/lib/colleges";

/** How many of the college's next games the profile offers to sign up for. */
const UPCOMING_LIMIT = 6;

const Profile = () => {
  const { viewer, loading, signOut, setViewer } = useSession();
  const { currentSeason } = useSeason();
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [collegeMatches, setCollegeMatches] = useState<Match[]>([]);
  const [fetching, setFetching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(viewer?.username || "");
  const [error, setError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // The user's upcoming games, whatever their college; and their college's next ones, to sign up for.
  const signedIn = !!viewer;
  const collegeId = viewer?.collegeId ?? null;
  useEffect(() => {
    if (!signedIn || !currentSeason) return;
    let live = true;
    setFetching(true);
    Promise.all([
      fetchMyMatches({ seasonId: currentSeason.id, upcoming: true }),
      collegeId
        ? fetchSeasonMatches(currentSeason.id, {
            collegeId,
            status: "scheduled",
            from: new Date().toISOString(),
            page: 1,
            pageSize: UPCOMING_LIMIT,
          })
        : { items: [] },
    ])
      .then(
        ([mine, college]) => {
          if (!live) return;
          setMyMatches(mine.items);
          setCollegeMatches(college.items);
        },
        (err) => console.error("Error fetching user matches:", err)
      )
      .finally(() => live && setFetching(false));
    return () => {
      live = false;
    };
  }, [signedIn, collegeId, currentSeason]);

  useEffect(() => {
    if (viewer?.username) setNewUsername(viewer.username);
  }, [viewer?.username]);

  const signedUpMatches = myMatches;
  const availableMatches = collegeMatches.filter((match) => !myMatches.some((m) => m.id === match.id));

  const handleEditUsername = async () => {
    setEditLoading(true);
    setError("");
    try {
      const username = newUsername.trim();
      await changeMe({ username });
      setViewer((v) => ({ ...v, username }));
      setIsEditing(false);
    } catch (err) {
      setError((err as Error).message);
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

  if (!viewer) {
    return (
      <div className="flex justify-center items-center h-screen px-4">
        <SignInPrompt message="Sign in to see your profile." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col max-w-[1500px] mx-auto">
      <div className="flex-grow m-3 ">
        <h2 className="text-lg sm:text-2xl font-semibold text-center mt-10">
          Hey {viewer.name.split(" ")[0]}, play some IMs today!
        </h2>
        <div className="mx-auto p-6 m-4 rounded-lg flex flex-col space-y-6 lg:items-start lg:flex-row lg:space-y-0 lg:space-x-6 justify-center lg:ml-10">
          {/* Right Side: Stats */}
          <div className="flex justify-center items-center flex-col space-y-6 lg:w-2/5 order-1 lg:order-2">
            <div className="p-6  bg-white dark:bg-black shadow-lg rounded-lg space-y-4 flex justify-center flex-col">
              <h2 className="text-lg sm:text-2xl font-semibold text-center">
                Your 2025 Stats Box!
              </h2>
              {viewer.collegeId && (
                <div className="flex justify-center items-center space-x-4">
                  <Image
                    src={getCollegeFlag(collegeName(viewer.collegeId) ?? "")}
                    alt={collegeName(viewer.collegeId) ?? ""}
                    width={100}
                    height={100}
                    className="rounded-md object-contain"
                  />
                </div>
              )}
              <div className="flex items-center flex-col">
                <p className="text-md font-bold flex items-center mb-3">
                  Username: {newUsername || "Anonymous"}
                  <span className="ml-2 flex items-center">
                    <MdModeEditOutline
                      style={{ fontSize: "24px" }} // Ensures a fixed size
                      className="cursor-pointer hover:text-blue-700"
                      onClick={() => setIsEditing(true)}
                    />
                  </span>
                </p>
              </div>
            </div>

            <CollegeAffiliation />

            <div className="hidden sm:block">
              <button
                onClick={signOut}
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
                  <div className="flex justify-center w pt-4">
                    <Link
                      href="/schedules"
                      className="p-2 sm:p-4 text-white text-xs sm:text-sm rounded-lg shadow transition duration-200 ease-in-out bg-blue-600 hover:scale-110"
                    >
                      See More on the Schedules Page!
                    </Link>
                  </div>
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
          <div className="bg-white dark:bg-black p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4">Edit Username</h2>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 mb-4 dark:bg-black"
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
                className="bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
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
