"use client";

import { useEffect, useState } from 'react';
import Leaderboard from '../components/Home/Leaderboard';
import LoadingScreen from '../components/LoadingScreen';

const HomePage: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // change title of page
  useEffect(() => {
    document.title = "Yale IMs";
  }, []);

  // useEffect(() => {
    
  //   // Display the loading
  //   setTimeout(() => {
  //     setIsLoading(false);
  //   }, 3000); // Wait for 3 seconds and then hide the loading screen
    
  //   // Fetch the session after a small delay
  //   setTimeout(() => {
  //     fetch("http://localhost:5001/api/auth/session", {
  //       credentials: "include",
  //     })
  //       .then((res) => res.json())
  //       .then((data) => {
  //         if (data.netid) {
  //           setUser(data.netid);
  //         } else {
  //           if (!window.location.href.includes("/api/auth/login")) {
  //             window.location.href = "http://localhost:5001/api/auth/login";
  //           }
  //         }
  //       })
  //       .catch((err) => {
  //         console.error("Failed to fetch session:", err);
  //       });
  //   }, 500); // 500ms delay to allow session propagation
  // }, []);

  // if (!user) {
  //   console.log("No User")
  //   return <LoadingScreen/>; 
  // }

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
