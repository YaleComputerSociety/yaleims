"use client";

import React, { useState } from "react";
import SportCard from "@src/app/About/SportCard";
import SportModal from "@src/app/About/SportModal";
import PageHeading from "@src/components/PageHeading";

const fallSports = [
  "Cornhole",
  "Soccer",
  "Spikeball",
  "Pickleball",
  "Table Tennis",
  "Flag Football",
];

const winterSports = ["Broomball", "CHoops", "MHoops", "WHoops", "Dodgeball"];

const springSports = ["Indoor Soccer", "Volleyball", "Netball"];

const AboutSportsPage = () => {
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  const handleSportClick = (sport: string) => {
    setSelectedSport(sport);
  };

  return (
    <div className="min-h-screen pt-20">
      <PageHeading heading="About Intramural Sports" />
      <div className="p-2 xs:p-8 flex flex-col w-11/12 sm:w-4/5 max-w-[1500px] mx-auto">
        <SportModal sport={selectedSport} setSport={setSelectedSport} />
        <div>
          <h2 className="text-lg font-semibold text-center md:text-left">
            Fall Sports (based on the Fall 2025-2026 season)
          </h2>
          <div className="flex flex-row py-2 flex-wrap gap-x-8 justify-center md:justify-start">
            {fallSports.map((sport, index) => (
              <div key={index}>
                <SportCard sport={sport} handleClick={handleSportClick} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-center md:text-left">
            Winter Sports (based on the Winter 2025-2026 Season){" "}
          </h2>
          <div className="flex flex-row py-2 flex-wrap gap-x-8 justify-center md:justify-start">
            {winterSports.map((sport, index) => (
              <div key={index}>
                <SportCard sport={sport} handleClick={handleSportClick} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-center md:text-left">
            Spring Sports (based on last Spring Season){" "}
          </h2>
          <div className="flex flex-row py-2 flex-wrap gap-x-8 justify-center md:justify-start">
            {springSports.map((sport, index) => (
              <div key={index}>
                <SportCard sport={sport} handleClick={handleSportClick} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSportsPage;
