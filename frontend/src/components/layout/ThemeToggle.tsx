"use client";
// The light/dark switch of the top bar. next-themes keeps the choice
// (localStorage "theme", "system" until the person picks one), so the
// button reads resolvedTheme, what is actually shown: on a light system,
// "system" shows the sun and the first click goes dark.
// The server can't know the theme, so the icon waits for mount; a blank of
// the same size keeps the bar from shifting and the HTML the same on both.
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { MdDarkMode, MdOutlineLightMode } from "react-icons/md";

const noSubscription = () => () => undefined;

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noSubscription, () => true, () => false);
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="p-2 rounded-xl transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Dark mode"
      aria-pressed={mounted ? dark : undefined}
    >
      {!mounted ? (
        <span className="block size-5" />
      ) : dark ? (
        <MdDarkMode className="text-gray-300 hover:text-yellow-300" size={20} />
      ) : (
        <MdOutlineLightMode className="text-gray-600 hover:text-amber-500" size={20} />
      )}
    </button>
  );
}
