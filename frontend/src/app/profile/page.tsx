"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";

const ProfilePage: React.FC = () => {
  const { user, signOut } = useUser(); // Access user and logout function
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <p>Please sign in to view your profile.</p>;
  }

  return (
    <div className="p-4">
      <h1>Profile</h1>
      <ul>
        <li>
          <strong>Name:</strong> {user.name}
        </li>
        <li>
          <strong>Email:</strong> {user.email}
        </li>
      </ul>
      <button onClick={signOut} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
        Logout
      </button>
    </div>
  );
};

export default ProfilePage;
