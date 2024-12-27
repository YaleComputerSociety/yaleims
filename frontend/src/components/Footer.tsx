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
        <div className="text-9xl font-medium -ml-8 -mb-4">YALE</div>
        <div className="flex items-center gap-10">
          <div className="text-9xl font-medium ">IMS</div>
          <div className="flex flex-row space-x-2 items-center">
          <a href="https://yalecomputersociety.org" className="text-center font-mono">Yale<br></br> Computer  <br></br> Society </a>
          <p> x </p>
          <a href="https://designatyale.com"> day</a>
          <p>Yale IMs &copy; 2024</p>
        </div>
        </div>
      </div>

    </footer>
  );
}

export default Footer;
