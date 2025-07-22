import React, { useState, useContext, useEffect } from "react";
import Link from "next/link";
import { IoIosMenu, IoMdClose } from "react-icons/io";
import { FiltersContext } from "@src/context/FiltersContext";
import { useUser } from "../context/UserContext";
import { MdDarkMode, MdOutlineLightMode } from "react-icons/md";
import Image from "next/image";
import { useTheme } from "next-themes";
import { LuLayoutDashboard } from "react-icons/lu";
import { MdOutlineScoreboard } from "react-icons/md";
import { GrSchedules } from "react-icons/gr";
import { PiHandCoinsLight } from "react-icons/pi";
import { IoInformationCircleOutline } from "react-icons/io5";
import { VscFeedback } from "react-icons/vsc";
import { usePathname } from "next/navigation";


const UserProfileButton: React.FC<{ name: string }> = ({ name }) => {
  return (
    <Link
      href="/profile"
      className="mt-3 py-1 px-3 hover:text-blue-400 border rounded-lg border-blue-600 hover:border-blue-400 text-blue-600"
    >
      Welcome, {name.split(" ")[0]}!
    </Link>
  );
};

const NavBar: React.FC = () => {
  const filtersContext = useContext(FiltersContext);
  const { resetFilters } = filtersContext;
  const [isClick, setisClick] = useState(false);
  const { user, loading } = useUser();
  const { theme, setTheme } = useTheme();

  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href.startsWith("http")) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const baseLink = "transition-all flex items-center p-2 rounded-md";
  const hoverLink = "hover:bg-slate-300 dark:hover:bg-slate-800";
  const activeLink = "bg-blue-600 text-yellow-500 text-white dark:bg-slate-800 dark:text-yellow-500 font-semibold";

  const homeActive = isActive("/");

  const toggleNavbar = () => {
    setisClick(!isClick);
  };

  const turnMenuOff = () => {
    setisClick(false);
    resetFilters();
  };

  const links = [
    { href: "/", text: "YALE IMS", text_mobile: "Home" },
    { href: "/dashboard", text: "Dashboard", icon: <LuLayoutDashboard /> },
    { href: "/scores", text: "Scores", icon: <MdOutlineScoreboard /> },
    { href: "/schedules", text: "Schedules", icon: <GrSchedules /> },
    { href: "/odds", text: "Odds", icon: <PiHandCoinsLight /> },
    { href: "/about-us", text: "About", icon: <IoInformationCircleOutline /> },
    { href: "https://yaleims.canny.io", text: "Feedback", icon: <VscFeedback /> },
  ];

  return (
    <nav className="mg:p-5 p-2 z-50 items-center md:w-[16%] md:h-full w-full fixed backdrop-blur-sm bg-white/50  dark:bg-black/50">
      <div className="md:flex md:flex-col justify-between items-left hidden">
        <div className="text-base pb-10 flex flex-row justify-between">
          <Link href={links[0].href} onClick={resetFilters}>
            <Image 
              src="/LOGO.png" 
              width={130} 
              height={130} 
              alt="YALE IMS"
            />
          </Link>
        </div>
        
        <div className="flex mp:text-base text-sm flex-col space-y-1 items-left">
          {links.slice(1).map((link) => {
            const active = isActive(link.href);
            return (
            <Link
              key={link.href}
              href={link.href}
              className={`${baseLink} ${active ? activeLink : hoverLink}`}
              onClick={resetFilters}
              target={link.text === "Feedback" ? "_blank" : ""}
            >
              <span className="mp:pr-2 pr-1">{link.icon}</span>
              {link.text}
            </Link>)
          })}
        </div>
      </div>

      {/* Mobile Navbar */}
      <div
        className={`${
          isClick ? "bg-white dark:bg-black pt-4 rounded-lg" : "bg-transparent"
        } -mt-2 md:hidden flex items-center justify-between`}
      >
        <button onClick={toggleNavbar} className="pl-4">
          {isClick ? (
            <IoMdClose
              size={30}
              className="-pl-8 text-gray-800 dark:text-gray-100"
            />
          ) : (
            <IoIosMenu
              size={30}
              className="mt-3 text-gray-800 dark:text-gray-100"
            />
          )}
        </button>
        <div className="flex gap-4">
          <div>
            {isClick ? ( 
              ""
            ) : (
              <button
                onClick={() => theme === "light" ? setTheme('dark') : setTheme('light')}
                className="mt-4 rounded transition-colors"
                aria-label="Toggle Light/Dark Mode"
              >
                {theme === "light" ? (
                  <MdOutlineLightMode
                    className="text-gray-800 hover:text-blue-600"
                    size={24}
                  />
                ) : (
                  <MdDarkMode
                    className="text-gray-100 hover:text-blue-300"
                    size={24}
                  />
                )}
              </button>
            )}
          </div>
          <div className="flex justify-between items-center">
            {!isClick ? (
              loading ? (
                <div className="animate-pulse text-gray-800 dark:text-gray-300 py-1 px-3">
                  Loading...
                </div>
              ) : user ? (
                <UserProfileButton name={user.name} />
              ) : (
                <Link
                  className={`py-1 px-3 mt-2 rounded border ${
                    theme === "light"
                      ? "border-black hover:border-gray-400 hover:text-gray-400"
                      : "border-gray-200 hover:border-gray-400  hover:text-gray-400 text-gray-100"
                  }`}
                  href='api/auth/login'
                >
                  Sign In
                </Link>

                // <button
                //   onClick={googleAuth}
                //   className={`py-1 px-3 rounded border mt-3 ${
                //     theme === "light"
                //       ? "border-black hover:border-gray-400 hover:text-gray-400"
                //       : "border-gray-200 hover:border-gray-400  hover:text-gray-400 text-gray-100"
                //   }`}
                // >
                //   Sign in with Google
                // </button>
              )
            ) : (
              ""
            )}
          </div>
        </div>
      </div>

      {/* Harmburger Menu */}
      {isClick && (
        <div className="mg:hidden -mt-4 bg-white dark:bg-black flex flex-col pb-4 px-6 space-y-4 rounded-b-lg shadow-lg">
          {links.map((link, index) => (
            <Link
              key={index + "-second"}
              href={link.href}
              onClick={turnMenuOff}
              className="hover:text-slate-300 dark:hover:text-blue-300 flex justify-center items-center font-medium transition duration-200"
            >
              {link.text_mobile || link.text}
            </Link>
          ))}
          <div>
            {loading ? (
              <div className="animate-pulse text-gray-300 text-center">
                Loading...
              </div>
            ) : user ? (
              <div className="flex justify-center">
                <UserProfileButton name={user.name} />
              </div>
            ) : (
              <Link
                className="block w-full bg-white items-cente text-center dark:bg-yellow-500 text-blue-700 dark:text-gray-900 py-2 px-4 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-yellow-600 transition duration-200"
                href='api/auth/login'
              >
                Sign In
              </Link>
              // <button
              //   onClick={googleAuth}
              //   className="block w-full bg-white dark:bg-yellow-500 text-blue-700 dark:text-gray-900 py-2 px-4 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-yellow-600 transition duration-200"
              // >
              //   Sign in with Google
              // </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
