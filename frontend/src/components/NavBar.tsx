import React, { useState, useContext, useEffect } from "react";
import Link from "next/link";
import { IoIosMenu, IoMdClose } from "react-icons/io";
import { FiltersContext } from "@src/context/FiltersContext";
import { useUser } from "../context/UserContext";
import { MdDarkMode, MdOutlineLightMode } from "react-icons/md";
import Image from "next/image";
import { useTheme } from "../context/ThemeContext";

const UserProfileButton: React.FC<{ name: string }> = ({ name }) => {
  return (
    <Link
      href="/profile"
      className="mt-3 py-1 px-3 rounded hover:text-blue-400 border rounded-lg border-blue-600 hover:border-blue-400 text-blue-600"
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
  const { theme, toggleTheme } = useTheme(); // Use global theme context

  const toggleNavbar = () => {
    setisClick(!isClick);
  };

  const turnMenuOff = () => {
    setisClick(false);
    resetFilters();
  };

  const links = [
    { href: "/", text: "YALE IMS", text_mobile: "Home" },
    { href: "/scores", text: "Scores" },
    { href: "/schedules", text: "Schedules" },
    { href: "/odds", text: "Odds" },
    { href: "/about-us", text: "About" },
    { href: "https://yaleims.canny.io", text: "Feedback" },
  ];

  return (
    <nav className="p-3 pb-4 items-center w-full fixed top-0 z-50 transition-colors duration-300 pr-5">
      <div className="mg:flex mg:block justify-between items-center hidden">
        <div className="hover:text-slate-500 text-xl pl-10">
          <Link href={links[0].href} onClick={resetFilters}>
            <Image src="/LOGO.png" width={130} height={130} alt="YALE IMS" />
          </Link>
        </div>
        <div className="flex space-x-4 items-center">
          {links.slice(1).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-slate-600 dark:hover:text-blue-400 flex justify-between items-center pl-1 pr-1 last:text-4xl last:pr-10"
              onClick={resetFilters}
              target={link.text === "Feedback" ? "_blank" : ""}
            >
              <div className="mt-2">{link.text}</div>
            </Link>
          ))}
          {/* Light/Dark Mode Icon */}
          <button
            onClick={toggleTheme}
            className="mt-2 rounded transition-colors"
            aria-label="Toggle Light/Dark Mode"
          >
            {theme === "light" ? (
              <MdOutlineLightMode
                className="text-gray-800 hover:text-blue-400"
                size={24}
              />
            ) : (
              <MdDarkMode
                className="text-gray-100 hover:text-yellow-300"
                size={24}
              />
            )}
          </button>

          {/* User Profile or Sign-In */}
          
          <div className="mt-2">
            {loading ? (
              <div className="animate-pulse text-gray-800 dark:text-gray-300">
                Loading...
              </div>
            ) : user ? (
              <UserProfileButton name={user.name} />
            ) : (
              <Link
                className={`py-1.5 px-3 rounded border ${
                  theme === "light"
                    ? "border-black hover:border-gray-400 hover:text-gray-400"
                    : "border-gray-200 hover:border-gray-400  hover:text-gray-400 text-gray-100"
                }`}
                href="api/auth/login"
              >
                Sign In With CAS
              </Link>
              // <button
              //   onClick={googleAuth}
              //   className={`py-1 px-3 rounded border ${
              //     theme === "light"
              //       ? "border-black hover:border-gray-400 hover:text-gray-400"
              //       : "border-gray-200 hover:border-gray-400  hover:text-gray-400 text-gray-100"
              //   }`}
              // >
              //   Sign in with Google
              // </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navbar */}
      <div
        className={`${
          isClick ? "bg-white dark:bg-black pt-4 rounded-lg" : "bg-transparent"
        } -mt-2 mg:hidden flex items-center justify-between`}
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
                onClick={toggleTheme}
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
                  Sign In With CAS
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
                Sign With CAS
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
