import Link from 'next/link';
import { useUser } from '../context/UserContext'
import { useTheme } from 'next-themes';
import { MdDarkMode, MdOutlineLightMode } from "react-icons/md";
import { useNavbar } from '@src/context/NavbarContext';
import { FaSignOutAlt } from "react-icons/fa";
import { PiConfetti } from "react-icons/pi";
import { useEffect, useRef, useState } from "react";
import { useConfettiEnabled, setConfettiEnabled } from "@src/utils/preferences";
import { useChampionship } from "@src/utils/useChampionship";


const UserMenu: React.FC<{ name: string }> = ({ name }) => {
  const first = (name ?? "").split(" ")[0] || "Friend";
  const { casSignOut } = useUser()
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const confettiEnabled = useConfettiEnabled();
  const { winningCollegeId, celebrationActive } = useChampionship();
  const celebrationLive = celebrationActive && !!winningCollegeId;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="py-1.5 px-4 border rounded-xl cursor-pointer border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 hover:border-blue-500/70 flex items-center gap-2 text-sm font-medium transition-all duration-200"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        Welcome, {first}!
      </button>
      <div
        role="menu"
        className={`
        absolute right-0 mt-2 min-w-[200px] rounded-xl border border-gray-200 dark:border-gray-700 p-1.5
        bg-white text-gray-800 shadow-lg shadow-black/5 dark:shadow-black/20 dark:bg-gray-900 dark:text-gray-100
        transition-all duration-200 ease-out z-50
        ${open
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
          : "opacity-0 scale-95 translate-y-1 pointer-events-none"}
        `}
      >
        {celebrationLive && (
          <button
              className="flex text-left py-2 px-3 gap-x-2 items-center justify-between rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm w-full text-gray-700 dark:text-gray-300 transition-colors duration-150"
              role="menuitemcheckbox"
              aria-checked={confettiEnabled}
              onClick={() => setConfettiEnabled(!confettiEnabled)}
          >
              <span className="flex items-center gap-x-2">
                <PiConfetti className="text-sm" />
                Confetti
              </span>
              <span
                className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors ${
                  confettiEnabled ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                    confettiEnabled ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </span>
          </button>
        )}
        <button
            className="flex text-left py-2 px-3 gap-x-2 items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm w-full text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150"
            role="menuitem"
            onClick={() => { setOpen(false); casSignOut(); }}
        >
            <FaSignOutAlt className="text-xs" />
            Sign out
        </button>
      </div>
    </div>
  );
};

// Helper Functions to detect mobile page + add special heading
function useIsMobile(threshold = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < threshold);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [threshold]);
  return isMobile;
}

function MobileHeading({ heading }: { heading: string }) {
  return (
    <div className="mt-[65px] mb-4 px-4 text-center">
      <p className="text-black dark:text-white text-4xl font-bold leading-[1.1] tracking-tight py-2">
        {heading}
      </p>
      <div className="mt-2 mx-auto w-12 h-1 rounded-full bg-blue-500/60" />
    </div>
  );
}

interface PageHeadingProps {
    heading: string;
}

export default function PageHeading({ heading }: PageHeadingProps) {
  const { user, loading } = useUser();
  const { theme, setTheme } = useTheme();
  const { collapsed } = useNavbar();
  const isMobile = useIsMobile();

  return (
    <>
      {/* main navbar heading (desktop) */}
      {!isMobile && (
        <div
            className={`transition-all duration-200 md:fixed md:top-0 md:z-50 flex flex-row 
            ${collapsed ? "w-[95%]" : "w-[84%]"} md:py-3 md:px-8 p-4 px-4 backdrop-blur-sm`}
        >
            <div className="w-full flex flex-row justify-between items-center">
            <h1 className="md:text-2xl text-xl font-bold text-gray-900 dark:text-white tracking-tight">{heading}</h1>
            <div className="hidden md:flex flex-row gap-x-4 items-center">
                <button
                onClick={() => theme === "light" ? setTheme('dark') : setTheme('light')}
                className="p-2 rounded-xl transition-all duration-200 text-center hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Toggle Light/Dark Mode"
                >
                {theme === "light" ? (
                    <MdOutlineLightMode className="text-gray-600 hover:text-amber-500 transition-colors" size={20} />
                ) : (
                    <MdDarkMode className="text-gray-300 hover:text-yellow-300 transition-colors" size={20} />
                )}
                </button>
                {loading ? (
                <div className="animate-pulse text-sm text-gray-500 dark:text-gray-400">
                    Loading...
                </div>
                ) : user ? (
                <UserMenu name={user.name} />
                ) : (
                <Link
                    className="py-1.5 px-4 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 hover:bg-blue-500/5"
                    href="api/auth/login"
                >
                    Sign In
                </Link>
                )}
          </div>
        </div>
      </div>
      )}

      {/*  Show the black mobile heading bar when on mobile */}
      {isMobile && <MobileHeading heading={heading} />}
    </>
  );
}