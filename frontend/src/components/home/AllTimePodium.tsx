import React from "react";
import Image from "next/image";

type AllTimePodiumProps = {
  rank: number;
  tyngWins: number;
  college: string;
  imgSrc: string;
  overlaySrc: string;
  overlayHeight: number;
  overlayWidth: number;
  overlayConfig: string;
  posHeight: string;
  imgsConfig: string;
};

const AllTimePodium: React.FC<AllTimePodiumProps> = ({
  rank,
  tyngWins,
  college,
  imgSrc,
  overlaySrc,
  overlayHeight,
  overlayWidth,
  overlayConfig,
  posHeight,
  imgsConfig,
}) => {
  return (
    <div
      className={`flex flex-col w-full items-center relative text-center ${
        rank != 1 ? "hidden xs:block" : ""
      }
      }`}
    >
      <div className={`relative ${imgsConfig} w-full -mb-10`}>
        <Image
          src={imgSrc}
          alt={college}
          width={120}
          height={120}
          className="absolute top-[32%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 mg:h-[146px] mg:w-[120px] h-[115px] w-[93px]"
        />
        <Image
          src={overlaySrc}
          alt="Overlay"
          width={overlayWidth}
          height={overlayHeight}
          className={`absolute top-[32%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${overlayConfig}`}
        />
      </div>
      <div
        className={`flex flex-col items-center justify-center rounded-t-2xl px-5 md:w-full ${posHeight} bg-blue-300 text-black dark:bg-black dark:text-white`}
      >
        <h1 className="mg:mb-2 mg:text-lg text-sm font-bold">{college}</h1>
        <h1 className="mg:text-5xl text-4xl font-bold">
          {rank}
          <sup className="text-2xl mg:text-3xl">
            {rank === 1 && "st"}
            {rank === 2 && "nd"}
            {rank === 3 && "rd"}
            {rank > 3 && "th"}
          </sup>
        </h1>
        <p className="text-md font-medium">
          {tyngWins as number} Tyng Cup Win{(tyngWins as number) > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
};

export default AllTimePodium;
