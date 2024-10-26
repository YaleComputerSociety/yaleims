"use client";

import { useEffect, useState } from "react";
import Leaderboard from "../components/Home/Leaderboard";

const HomePage: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);

  // change title of page
  useEffect(() => {
    document.title = "Yale IMs";
  }, []);

  useEffect(() => {
    // Fetch the session after a small delay
    setTimeout(() => {
      fetch("http://localhost:5001/api/auth/session", {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.netid) {
            setUser(data.netid);
          } else {
            if (!window.location.href.includes("/api/auth/login")) {
              window.location.href = "http://localhost:5001/api/auth/login";
            }
          }
        })
        .catch((err) => {
          console.error("Failed to fetch session:", err);
        });
    }, 500); // 500ms delay to allow session propagation
  }, []);

  if (!user) {
    console.log("No User");
    return <p>Loading...</p>; // Need to change this so that there is a sign up page
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <br />
      <h1 className="text-4xl font-bold text-center mb-8">Welcome {user}</h1>
      <h1 className="text-4xl font-bold text-center mb-8"> Leaderboard</h1>
      <Leaderboard />
    </div>
  );
};

export default HomePage;
