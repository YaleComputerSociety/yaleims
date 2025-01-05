import React, { useEffect, useState, useContext } from "react";
import Image from "next/image";

const Podium = (colleges: any) => {
  console.log(colleges.colleges[1]);
  console.log(colleges["1"]);
  return (
    <div className="flex gap-4 justify-center">
{/*         
      <div
        className={`relative ${
          size === "large" ? "w-52 h-52" : "w-24 h-24"
        } flex items-center justify-center mb-4`}
      > */}
        {/* Main College Flag */}
        {/* <Image
          src={`/college_flags/${college.name.replace(/\s+/g, " ")}.png`}
          alt={college.name}
          width={size === "large" ? 160 : 96}
          height={size === "large" ? 160 : 96}
          className="object-contain p-3"
        /> */}

        {/* Overlay Image */}
        {/* <Image
          src={`/college_flags/${place}.png`}
          alt={`${place} Place Overlay`}
          width={size === "large" ? 400 : 50}
          height={size === "large" ? 400 : 50}
          layout="fixed"
          className={`absolute ${place === "first" ? "top-10" : "top-20"}`}
        />
      </div> */}
      <div className="flex flex-col items-center justify-center rounded-lg w-48 h-40 bg-podium_light text-white dark:bg-black">
        <p>{colleges.colleges[1]["name"]}</p>
        <p className="text-xl font-bold">2nd</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg w-48 h-100 bg-podium_light text-white dark:bg-black">
        <p>{colleges.colleges[0]["name"]}</p>
        <p className="text-xl font-bold">1st</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg w-48 h-40 bg-podium_light text-white dark:bg-black">
        <p>{colleges.colleges[2]["name"]}</p>
        <p className="text-xl font-bold">3rd</p>
      </div>
    </div>
  );
};

export default Podium;
