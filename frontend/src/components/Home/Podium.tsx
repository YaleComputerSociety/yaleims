import React, { useEffect, useState, useContext } from "react";
import Image from "next/image";

const Podium = (colleges: any) => {
  console.log(colleges.colleges[1]);
  console.log(colleges["1"]);
  return (
    <div className="flex items-center gap-4 justify-center">
      <div className="relative flex flex-col items-center justify-center mb-4 self-end">
        {/* Main College Flag */}
        <Image
          src={`/college_flags/${colleges.colleges[2].name.replace(
            /\s+/g,
            " "
          )}.png`}
          alt={colleges.colleges[2].name}
          width={160}
          height={160}
          className="object-contain p-3"
        />
        <div className="flex flex-col items-center justify-center rounded-lg w-48 h-36 bg-podium_light text-white dark:bg-black">
          <p>{colleges.colleges[2]["name"]}</p>
          <p className="text-xl font-bold">3rd</p>
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center mb-4">
        {/* Main College Flag */}
        <Image
          src={`/college_flags/${colleges.colleges[0].name.replace(
            /\s+/g,
            " "
          )}.png`}
          alt={colleges.colleges[0].name}
          width={160}
          height={160}
          className="object-contain p-3"
        />
        <div className="flex flex-col items-center justify-center rounded-lg w-48 h-60 bg-podium_light text-white dark:bg-black">
          <p>{colleges.colleges[0]["name"]}</p>
          <p className="text-xl font-bold">1st</p>
        </div>
      </div>
      <div className="relative flex flex-col items-center mb-4 self-end">
        {/* Main College Flag */}
        <Image
          src={`/college_flags/${colleges.colleges[1].name.replace(
            /\s+/g,
            " "
          )}.png`}
          alt={colleges.colleges[1].name}
          width={160}
          height={160}
          className="object-contain p-3"
        />
        <div className="flex flex-col items-center justify-center rounded-lg w-48 h-48 bg-podium_light text-white dark:bg-black">
          <p>{colleges.colleges[1]["name"]}</p>
          <p className="text-xl font-bold">2nd</p>
        </div>
      </div>
    </div>
  );
};

export default Podium;
