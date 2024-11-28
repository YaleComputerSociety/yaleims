import React, { useContext } from "react";
import Link from "next/link";
import { FaHome, FaCalendar } from "react-icons/fa";
import { BsFileBarGraphFill } from "react-icons/bs";
import { IoIosMenu, IoMdClose } from "react-icons/io";
import { FiltersContext } from "@src/context/FiltersContext";
import { useUser } from "../context/UserContext";

const UserProfileButton: React.FC<{ name: string }> = ({ name }) => {
  return (
    <Link
      href="/profile"
      className="bg-white text-blue-600 py-1 px-3 rounded hover:bg-gray-100"
    >
      Welcome, {name}!
    </Link>
  );
};

const NavBar: React.FC = () => {
  const filtersContext = useContext(FiltersContext);
  const { resetFilters } = filtersContext;
  const [isClick, setisClick] = React.useState(false);

  const { user, signIn, loading } = useUser(); // Access user context

  const toggleNavbar = () => {
    setisClick(!isClick);
  };

  const turnMenuOff = () => {
    setisClick(false);
    resetFilters();
  };

  const links = [
    { href: "/", text: "YALE IMS", text_mobile: "Home", icon: <FaHome /> },
    { href: "/about", text: "About", icon: <FaCalendar /> },
    { href: "/scores", text: "Scores", icon: <BsFileBarGraphFill /> },
    { href: "/schedule", text: "Schedule", icon: <FaCalendar /> },
  ];

  return (
    <nav className="md:bg-blue-600 bg-blue-600 text-white p-5 items-center w-full fixed top-0 z-50">
      <div className="md:flex md:block justify-between items-center hidden">
        <div className="hover:text-slate-300 text-xl pl-10">
          <Link href={links[0].href} onClick={resetFilters}>
            {links[0].text}
          </Link>
        </div>
        <div className="flex space-x-4">
          {links.slice(1).map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-slate-300 flex justify-between items-center pl-4 pr-4 last:text-4xl last:pr-10"
              onClick={resetFilters}
            >
              <div className=" ">{link.text}</div>
              <div className="pl-1">{link.icon}</div>
            </Link>
          ))}

          {/* User Profile or Sign-In */}
          {loading ? (
            <div className="animate-pulse text-white">Loading...</div>
          ) : user ? (
            <UserProfileButton name={user.name} />
          ) : (
            <button
              onClick={signIn}
              className="bg-white text-blue-600 py-1 px-3 rounded hover:bg-gray-100"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
      <div className="md:hidden flex items-center">
        <button onClick={toggleNavbar}>
          {isClick ? <IoMdClose size={30} /> : <IoIosMenu size={30} />}
        </button>
      </div>
      {isClick && (
        <div className="md:hidden bg-blue-600 flex flex-col pb-4 px-6 space-y-4 rounded-b-lg shadow-lg">
          {links.map((link, index) => (
            <Link
              key={index + "-second"}
              href={link.href}
              onClick={turnMenuOff}
              className="hover:text-slate-300 flex justify-center items-center font-medium transition duration-200"
            >
              {link.text_mobile || link.text}
            </Link>
          ))}
          {/* Add User Profile or Sign-In in the mobile menu */}
          <div className="pt-4 border-t border-white/30">
            {loading ? (
              <div className="animate-pulse text-gray-300 text-center">Loading...</div>
            ) : user ? (
              <div className="flex justify-center">
                <UserProfileButton name={user.name} />
              </div>
            ) : (
              <button
                onClick={signIn}
                className="block w-full bg-white text-blue-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-100 transition duration-200"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      )}

    </nav>
  );
};

export default NavBar;
