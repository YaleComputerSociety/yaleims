import React from "react";
import CPodium from "./YearlyPodium";

interface YearlyPodiumsProps {
  colleges: any;
  onCollegeClick: any;
}

export const YearlyPodiums: React.FC<YearlyPodiumsProps> = ({
  colleges,
  onCollegeClick,
}) => {
  const overlaySources = [
    "/college_flags/bronze_overlay.png", // 3rd place
    "/college_flags/gold_overlay.png", // 1st place
    "/college_flags/silver_overlay.png", // 2nd place
  ];

  const positions = [
    {
      posHeight: "h-48 w-40",
      overlayHeight: 160,
      overlayWidth: 160,
      overlayConfig: "mg:h-[190px] mg:w-[165px] h-[150px] w-[120px]",
    }, // 3rd
    {
      posHeight: "h-40 xs:h-64 w-56 xs:w-44",
      overlayHeight: 400,
      overlayWidth: 400,
      overlayConfig: "mg:h-[190px] mg:w-[210px] h-[150px] w-[170px]",
    }, // 1st
    {
      posHeight: "h-52 w-40",
      overlayHeight: 160,
      overlayWidth: 160,
      overlayConfig: "mg:h-[190px] mg:w-[165px] h-[150px] w-[120px]",
    }, // 2nd
  ];

  // Map the colleges to their intended positions: 3rd, 1st, 2nd
  const reorderedColleges = [colleges[2], colleges[0], colleges[1]];

  return (
    <div className="flex justify-center sm:gap-x-6 md:gap-x-12 items-end md:max-w-[80%] max-w-[60%] mx-auto">
      {reorderedColleges.map((college, index) => (
        <CPodium
          key={college.name}
          posHeight={positions[index].posHeight}
          imgSrc={`/college_flags/${college.name}.png`}
          overlaySrc={overlaySources[index]}
          imgsConfig="mg:h-[170px] h-[150px]"
          overlayHeight={positions[index].overlayHeight}
          overlayWidth={positions[index].overlayWidth}
          overlayConfig={positions[index].overlayConfig}
          college={college}
          onSelect={onCollegeClick}
        />
      ))}
    </div>
  );
};
