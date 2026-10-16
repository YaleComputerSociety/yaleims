"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Whether to draw the light-mode variant of theme-dependent UI (the theme
 * toggle icon, the navbar sign-in button), plus the toggle itself.
 *
 * The theme lives in the browser (next-themes), so the server renders these
 * without it, as the dark variant. Reporting "not light" until the component
 * has mounted keeps the first client render identical to the server's HTML
 * (React does not patch mismatched attributes, so light mode used to keep the
 * dark icon); the real theme applies right after.
 */
export default function useLightTheme() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return {
    isLight: mounted && theme === "light",
    toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
  };
}
