import React, { useContext } from "react";
import Link from "next/link";
import { FaHome, FaCalendar } from "react-icons/fa";
import { BsFileBarGraphFill } from "react-icons/bs";
import { CgProfile } from "react-icons/cg";
import { IoIosMenu, IoMdClose } from "react-icons/io";
import { FiltersContext } from "@src/context/FiltersContext";

const NavBar: React.FC = () => {
  const filtersContext = useContext(FiltersContext);

  const { resetFilters } = filtersContext;
  const [isClick, setisClick] = React.useState(false);

  const toggleNavbar = () => {
    setisClick(!isClick);
  };

  const turnMenuOff = () => {
    setisClick(false);
    resetFilters();
  };

  const links = [
    { href: "/", text: "YALE IMS", icon: <FaHome /> },
    { href: "/about", text: "About", icon: <FaCalendar /> },
    { href: "/scores", text: "Scores", icon: <BsFileBarGraphFill /> },
    { href: "/schedule", text: "Schedule", icon: <FaCalendar /> },
    { href: "/profile", text: "", icon: <CgProfile /> },
  ];

  return (
    <nav className="md:bg-blue-600 bg-blue-600 text-white md:p-5 items-center w-full fixed top-0 z-50">
      <div className="md:flex md:block justify-between items-center hidden">
        <div className="text-xl pl-10">
          <Link 
            href={links[0].href}
            onClick={resetFilters}
          >
            {links[0].text}
          </Link>
        </div>
        <div className="flex space-x-4">          
          {links.slice(1).map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:underline flex fustify-between items-center pl-4 pr-4 last:text-4xl last:pr-10"
              onClick={resetFilters}
            >
              <div>{link.text}</div>
              <div className="pl-1">{link.icon} </div>             
            </Link>
          ))}
        </div>
      </div>
      <div className="md:hidden flex p-3 items-center">
        <button onClick={toggleNavbar}>
          {isClick ? <IoMdClose size={30} /> : <IoIosMenu size={30} />}
        </button>
      </div>
      {isClick && (
        <div className="md:hidden flex flex-col pb-4 pl-4 space-y-2">
          {links.map((link, index) => (
            <Link
              key={index + '-second'} 
              href={link.href}
              onClick={turnMenuOff}
              className="hover:underline flex items-center"
            >
              {link.icon}
              {link.text}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default NavBar;
