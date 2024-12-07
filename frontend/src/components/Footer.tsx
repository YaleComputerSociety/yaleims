import React, { useContext } from "react";
import Link from "next/link";
import { FiltersContext } from "@src/context/FiltersContext";

function Footer() {
  const filtersContext = useContext(FiltersContext);

  const { resetFilters } = filtersContext;

  const links = [
    { href: "/about", text: "About" },
    { href: "/scores", text: "Scores" },
    { href: "/schedule", text: "Schedule" },
  ];

  return (
    <div className="p-5 bg-blue-500 text-white">
      <div className="flex pb-5 justify-between">
        <p>Yale IMs &copy; 2024</p>
        <div className="flex flex-row space-x-2">
          <a href="https://yalecomputersociety.org">YCS </a>
          <p> x </p>
          <a href="https://designatyale.com"> day</a>
        </div>
      </div>
      <div className="flex flex-row xs:space-x-10 pb-5 justify-center">
        {links.map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className="hover:text-slate-300 flex justify-between items-center pl-4 pr-4"
            onClick={resetFilters}
          >
            <div className=" ">{link.text}</div>
          </Link>
        ))}
      </div>

      <div className="flex justify-center">
        <img src="/LOGO.png" />
      </div>
    </div>
  );
}

export default Footer;
