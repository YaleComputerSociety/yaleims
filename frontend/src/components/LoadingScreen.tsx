import React from "react";
import { useTheme } from "../context/ThemeContext";

const LoadingScreen = () => {
  const { theme } = useTheme(); // Use global theme context

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 ${
        theme === "light" ? "bg-primary_light" : "bg-black"
      } transition-colors`}
    >
      <img
        src="/loader_animations/sport_loader.gif"
        alt="Loading..."
        className="object-contain max-w-full max-h-full"
      />
    </div>
  );
};

export default LoadingScreen;
