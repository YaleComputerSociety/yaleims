"use client";

import { useEffect, useState } from "react";
import Leaderboard from "../components/home/Leaderboard";
import LeaderboardMobile from "../components/home/LeaderboardMobile";

const HomePage: React.FC = () => {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.title = "Yale IMs";
  }, []);

  useEffect(() => {
    document.documentElement.classList.add(theme);
    return () => {
      document.documentElement.classList.remove(theme);
    };
  }, [theme]);

  return (
    <div className="min-h-screen">
      <br />
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
