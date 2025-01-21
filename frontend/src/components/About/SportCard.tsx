"use client";

import React from "react";
import { emojiMap } from "@src/utils/helpers";
import { SportCardProps } from "@src/types/components";

type ColorMap = Record<string, string>;

const sportColors: ColorMap = {
  Cornhole: "border-[#EBC119]",
  Soccer: "border-[#BBB59E]",
  Spikeball: "border-[#FFAF2D]",
  Pickleball: "border-[#378923]",
  "Table Tennis": "border-[#FF8D8C]",
  "Flag Football": "border-[#9D593C]",
  Broomball: "border-[#C0A27E]",
  CHoops: "border-[#F58C42]",
  MHoops: "border-[#F58C42]",
  WHoops: "border-[#F58C42]",
  Dodgeball: "border-[#D8A4A4]",
  "Indoor Soccer": "border-[#BBB59E]",
  Volleyball: "border-[#5F4E47]",
  Netball: "border-[#AF2819]",
};

const sportDisplayName: ColorMap = {
  Cornhole: "Cornhole",
  Soccer: "Soccer",
  Spikeball: "Spikeball",
  Pickleball: "Pickleball",
  "Table Tennis": "Table\nTennis",
  "Flag Football": "Flag\nFootball",
  Broomball: "Broomball",
  CHoops: "Coed\nBasketball",
  MHoops: "Men's\nBasketball",
  WHoops: "Women's\nBasketball",
  Dodgeball: "Dodgeball",
  "Indoor Soccer": "Indoor\nSoccer",
  Volleyball: "Volleyball",
  Netball: "Netball",
};

const SportCard: React.FC<SportCardProps> = ({ sport, handleClick }) => {
  return (
    <div className="flex flex-col items-center space-y-2 py-5">
      <div
        onClick={() => handleClick(sport)}
        className={`p-5 rounded-full border-8 text-3xl cursor-pointer ${
          sportColors[sport] || "border-blue-400"
        }`}
      >
        {emojiMap[sport]}
      </div>
      <div className="text-center whitespace-pre-line">
        {sportDisplayName[sport]}
      </div>
    </div>
  );
};

export default SportCard;
