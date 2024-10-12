import React from "react";
import Link from "next/link";
import { FaHome, FaCalendar } from "react-icons/fa";
import { BsFileBarGraphFill } from "react-icons/bs";
import { CgProfile } from "react-icons/cg";

const NavBar: React.FC = () => {
  return (
    <nav className="bg-blue-600 p-4 text-white flex justify-between items-center">
      <div className="flex space-x-4">
        <Link href="/" className="hover:underline">
          <div className="flex justify-between w-auto items-center  ">
            <FaHome /> Home
          </div>
        </Link>
        <Link href="/scores" className="hover:underline">
          <div className="flex justify-between w-auto items-center  ">
            <BsFileBarGraphFill /> Scores
          </div>
        </Link>
        <Link href="/schedule" className="hover:underline">
          <div className="flex justify-between w-auto items-center  ">
            <FaCalendar /> Schedule
          </div>
        </Link>
        {/* <Link href="/ref-scoring" className="hover:underline">
          Ref Scoring
        </Link>
        <Link href="/manage-users" className="hover:underline">
          Manage Users
        </Link>
        <Link href="/manage-brackets" className="hover:underline">
          Manage Brackets
        </Link> */}
      </div>

      <div>
        <Link href="/profile" className="hover:underline">
          <div className="flex justify-between w-auto items-center">
            <CgProfile /> Profile
          </div>
        </Link>
      </div>
    </nav>
  );
};

export default NavBar;
