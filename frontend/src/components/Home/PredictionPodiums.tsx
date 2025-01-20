import React from "react";
import PredictionPodium from "./PredictionPodium";

type PredictionPodiumsProps = {
  users: {
    username: string;
    points: number;
    correctPredictions: number;
    college: string;
  }[];
};

const PredictionPodiums: React.FC<PredictionPodiumsProps> = ({ users }) => {
  console.log(users);
  if (!users || users.length < 3) {
    console.error("PredictionPodiums requires at least 3 users.");
    return null;
  }

  // Reorder to show 3rd, 1st, and 2nd in the podium
  const reorderedUsers = [users[2], users[0], users[1]];

  console.log(reorderedUsers);

  // Overlay and position configurations
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
      imgsConfig: "mg:h-[170px] h-[150px]",
      rank: 3,
    },
    {
      posHeight: "h-40 xs:h-64 w-56 xs:w-44",
      overlayHeight: 400,
      overlayWidth: 400,
      overlayConfig: "mg:h-[190px] mg:w-[210px] h-[150px] w-[170px]",
      imgsConfig: "mg:h-[170px] h-[150px]",
      rank: 1,
    },
    {
      posHeight: "h-52 w-40",
      overlayHeight: 160,
      overlayWidth: 160,
      overlayConfig: "mg:h-[190px] mg:w-[165px] h-[150px] w-[120px]",
      imgsConfig: "mg:h-[160px] h-[140px]",
      rank: 2,
    },
  ];

  return (
    <div className="flex justify-center sm:gap-x-6 md:gap-x-12 items-end md:max-w-[80%] max-w-[60%] mx-auto">
      {reorderedUsers.map((user, index) => (
        <PredictionPodium
          key={positions[index].rank}
          rank={positions[index].rank}
          username={user.username}
          ycoins={user.points}
          correctPredictions={user.correctPredictions}
          college={user.college}
          imgSrc={`/college_flags/${user.college}.png`}
          overlaySrc={overlaySources[index]}
          posHeight={positions[index].posHeight}
          imgsConfig={positions[index].imgsConfig}
          overlayHeight={positions[index].overlayHeight}
          overlayWidth={positions[index].overlayWidth}
          overlayConfig={positions[index].overlayConfig}
        />
      ))}
    </div>
  );
};

export default PredictionPodiums;
