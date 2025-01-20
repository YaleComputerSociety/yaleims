"use client";

import { useEffect, useState } from "react";
import AAHomeComponent from "../components/Home/AAHomeComponent";

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
      <AAHomeComponent />
      <br />
      <br />
      <br />
    </div>
  );
};

export default HomePage;
