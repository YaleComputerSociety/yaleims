"use client"

import { useUser } from "../../context/UserContext";
import Image from "next/image";

const Profile = () => {
  const { user, loading, signOut } = useUser();

  const handleLogout = async () => {
    try {
      await signOut(); // Sign out the user
      // Handle any post-signout actions like redirecting or updating state
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-500">
        <span>Loading...</span>
      </div>
    );
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
        <br />
        <div className="max-w-4xl mx-auto p-6 m-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <Image
              src={`/college_flags/${user.college.replace(/\s+/g, " ")}.png`}
              alt={user.college}
              width={48}
              height={48}
              className="rounded-md object-contain"
            />
            <h2 className="text-3xl font-semibold">{user.name}&apos;s Profile</h2>
          </div>
  
          <div className="space-y-3">
            <p className="text-lg">
              <strong>College:</strong> {user.college}
            </p>
            <p className="text-lg">
              <strong>Points:</strong> {user.points}
            </p>
            <p className="text-lg">
              <strong>Matches:</strong> {user.matches.length}
            </p>
          </div>
  
          <div className="mt-6 text-gray-500 text-sm">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
          </div>
          {/* Add Log Out Button */}
          <button
            onClick={handleLogout}
            className="mt-6 py-2 px-4 bg-red-500 text-white rounded-md"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
  
};

export default Profile;
