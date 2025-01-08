"use client";

import { useEffect, useState } from "react";
import Leaderboard from "../components/home/Leaderboard";
import LeaderboardMobile from "../components/home/LeaderboardMobile";
import Footer from "@src/components/Footer";

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
      <Leaderboard />
    </div>
  );
};

export default HomePage;
