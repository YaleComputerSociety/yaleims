"use client";

import { useEffect, useState } from "react";
import AAHomeComponent from "@src/components/Home/AAHomeComponent"
import Link from "next/link";

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
      {/* Banner */}
      <div className="bg-blue-600 text-white text-center p-4 font-bold">
        Welcome back from Spring Break! 🏆 Intramural Sports Spring Season is
        upon us. We will do our best to keep up with the intramural sports
        schedules and weather conflicts! 📩{" "}
        <Link href="/contact" className="underline">
          Contact us
        </Link>{" "}
        if you have any questions.
      </div>
      <AAHomeComponent />
      <br />
      <br />
      <br />
    </div>
  );
};

export default HomePage;
