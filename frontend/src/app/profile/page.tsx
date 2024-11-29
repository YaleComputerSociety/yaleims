"use client";

import { useUser } from "../../context/UserContext"; // Assuming the context is stored in this path
import Image from "next/image";

const Profile = () => {
  const { user, loading } = useUser();

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
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg space-y-6">
      <br></br>
      <br></br>
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
    </div>
  );
};

export default Profile;
