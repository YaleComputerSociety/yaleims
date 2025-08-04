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

// no Tailwind prefixes here – just the colours
const sportHex: Record<string, string> = {
  Cornhole:      '#EBC119',
  Soccer:        '#BBB59E',
  Kanjam: '#0047AB',
  Spikeball:     '#FFAF2D',
  Pickleball:    '#378923',
  'Table Tennis':'#FF8D8C',
  'Flag Football':'#9D593C',
  Broomball:     '#C0A27E',
  CHoops:        '#F58C42',
  MHoops:        '#F58C42',
  WHoops:        '#F58C42',
  Dodgeball:     '#D8A4A4',
  'Indoor Soccer':'#BBB59E',
  Volleyball:    '#5F4E47',
  Netball:       '#AF2819',
};


export const sportDisplayName: ColorMap = {
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

const SportCard: React.FC<SportCardProps> = ({ sport, handleClick, displayName, active }) => {
  return (
    <div className="group flex flex-col items-center space-y-2">
      <div
        onClick={() => handleClick(sport)}
        /* expose the colour as a CSS custom property */
        style={{ '--sport-col': sportHex[sport] } as React.CSSProperties}
        className={
          `relative z-10
            p-2 mg:p-4 rounded-full text-lg mg:text-2xl cursor-pointer
            border-4 xs:border-8 border-[color:var(--sport-col)]
            transition-[transform,box-shadow,border] duration-300

            group-hover:scale-105 group-focus-visible:scale-105
            group-hover:shadow-[0_0_0_2px_var(--sport-col),0_0_15px_var(--sport-col)]
            group-focus-visible:shadow-[0_0_0_2px_var(--sport-col),0_0_15px_var(--sport-col)]
          ` + (active ? `
            scale-105
            shadow-[0_0_0_2px_var(--sport-col),0_0_25px_var(--sport-col)]
            ring-offset-2 ring-[color:var(--sport-col)]` : '')
        }
      >
        {emojiMap[sport]}
        <div className="absolute text-xs transition-opacity bg-blue-100 border border-blue-600 dark:bg-black dark:text-white dark:border-black rounded opacity-0 group-hover:opacity-100">
          {sport}
        </div>
      </div>
      {displayName && (
      <div className="text-center whitespace-pre-line">
        {sportDisplayName[sport]}
      </div>)}
    </div>
  );
};

export default SportCard;
