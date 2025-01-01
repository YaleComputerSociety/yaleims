"use client"

import React, { FC, ReactNode, createContext, useState, useEffect, useContext } from "react";

type ThemeContextType = {
  theme: string;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<string>("light"); // Default to light during SSR
  

  // On first load, synchronize with localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPreference =
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  
    // Use saved theme if available, else fall back to system preference
    const initialTheme = savedTheme || systemPreference;
  
    setTheme(initialTheme);
  
    // Ensure <html> has the correct class on first render
    const root = document.documentElement;
    root.classList.add(initialTheme);
  }, []);
  

  // Update the theme class on the <html> element and save to localStorage
  useEffect(() => {
    const root = document.documentElement;
    const oldTheme = theme === "light" ? "dark" : "light";

    root.classList.remove(oldTheme); // Remove the old theme
    root.classList.add(theme); // Add the new theme
    localStorage.setItem("theme", theme); // Persist the new theme
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
