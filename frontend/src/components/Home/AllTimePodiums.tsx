import React from "react";
import AllTimePodium from "./AllTimePodium";
import { allTimeStandings } from "@src/utils/helpers";
import { getCollegeFlag, getVersionedImage } from "@/utils/versionedImages";

const overlaySources = [
  getVersionedImage("/college_flags/bronze_overlay.png"), // 3rd place
  getVersionedImage("/college_flags/gold_overlay.png"), // 1st place
  getVersionedImage("/college_flags/silver_overlay.png"), // 2nd place
];

const positions = [
  {
    posHeight: "h-48 w-40",
    overlayHeight: 160,
    overlayWidth: 160,
    overlayConfig: "mg:h-[190px] mg:w-[165px] h-[150px] w-[120px]",
    rank: 3,
  }, // 3rd
  {
    posHeight: "h-40 xs:h-64 w-56 xs:w-44",
    overlayHeight: 400,
    overlayWidth: 400,
    overlayConfig: "mg:h-[190px] mg:w-[210px] h-[150px] w-[170px]",
    rank: 1,
  }, // 1st
  {
    posHeight: "h-52 w-40",
    overlayHeight: 160,
    overlayWidth: 160,
    overlayConfig: "mg:h-[190px] mg:w-[165px] h-[150px] w-[120px]",
    rank: 2,
  }, // 2nd
];

export const AllTimePodiums: React.FC = () => {
  // Map the podiums to their intended positions: 3rd, 1st, 2nd
  const reorderedPodiums = [
    allTimeStandings[2],
    allTimeStandings[0],
    allTimeStandings[1],
  ];

  return (
    <div className="flex justify-center sm:gap-x-6 md:gap-x-12 items-end md:max-w-[80%] max-w-[60%] mx-auto">
      {reorderedPodiums.map(([college, tyngWins], index) => (
        <AllTimePodium
          key={college}
          rank={positions[index].rank}
          tyngWins={Number(tyngWins)} // Ensure tyngWins is a number
          college={String(college)}
          imgSrc={getCollegeFlag(String(college))}
          overlaySrc={overlaySources[index]}
          posHeight={positions[index].posHeight}
          imgsConfig="mg:h-[170px] h-[150px]"
          overlayHeight={positions[index].overlayHeight}
          overlayWidth={positions[index].overlayWidth}
          overlayConfig={positions[index].overlayConfig}
        />
      ))}
    </div>
  );
};

export default AllTimePodiums;
