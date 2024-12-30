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
    <footer className="p-5">
      <div>
        {/* <div className="sm:text-9xl text-3xl font-medium -ml-8 -mb-4 xs:m-0">YALE</div>
        <div className="flex items-center gap-10">
          <div className="sm:text-9xl text-3xl font-medium ">IMS</div>
          <div className="flex flex-row space-x-2 items-center">
          <a href="https://yalecomputersociety.org" className="text-center font-mono">Yale<br></br> Computer  <br></br> Society </a>
          <p> x </p>
          <a href="https://designatyale.com"> day</a>
          <p>The Team.</p>
          <p>Yale IMs &copy; 2024</p>
        </div>
        </div> */}
        <br></br>
        <p className="text-right">Yale IMs &copy; 2024 - A <a className="font-bold" href="https://yalecomputersociety.org/">y/cs</a> and <a className="font-bold" href="https://designatyale.com/">day</a> product</p>
      </div>

    </footer>
  );
}

export default Footer;
