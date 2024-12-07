"use client";

import { useEffect } from "react";
import Leaderboard from "../components/Home/Leaderboard";
import LeaderboardMobile from "../components/Home/LeaderboardMobile";

const HomePage: React.FC = () => {
  useEffect(() => {
    document.title = "Yale IMs";
  }, []);

  return (
    <div className="min-h-screen p-8">
      <br />
      <h1 className="text-xl md:text-4xl font-bold text-center mb-8 text-blue-600">Leaderboard</h1>
      <div className="xs:hidden">
        <LeaderboardMobile />
      </div>
      <div className="hidden xs:block">
        <Leaderboard />
      </div>
      
    </div>
  );
};

export default HomePage;
