import React, { useEffect, useState } from "react";

type PredictionLeaderboardProps = {
  users: {
    rank: number;
    username: string;
    points: number;
    correctPredictions: number;
  }[];
};

const PredictionLeaderboard: React.FC<PredictionLeaderboardProps> = ({
  users,
}) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 569px)");
    const handleScreenChange = () => setIsSmallScreen(mediaQuery.matches);

    // Set initial value and add event listener
    handleScreenChange();
    mediaQuery.addEventListener("change", handleScreenChange);

    // Cleanup listener on unmount
    return () => mediaQuery.removeEventListener("change", handleScreenChange);
  }, []);

  // Slice the users list based on the screen size
  const displayedUsers = isSmallScreen
    ? users.slice(1, 10)
    : users.slice(3, 10);

  return (
    <div className="overflow-x-auto">
      <table className="w-11/12 xs:max-w-[90%] mx-auto border-collapse border border-gray-300 dark:border-gray-800 divide-y divide-gray-200">
        <thead className="bg-white dark:bg-[#132750]">
          <tr>
            <th className=" px-2 py-3 text-center font-medium border border-gray-300 dark:border-gray-600">
              <span className="hidden xs:inline p-3 text-sm">RANK</span>
              <span className="xs:hidden text-xs">R</span>
            </th>
            <th className="px-2 py-3 text-left  font-medium border border-gray-300 dark:border-gray-600">
              <span className="hidden xs:inline p-3 text-sm">USERNAME</span>
              <span className="xs:hidden text-xs">USER</span>
            </th>
            <th className=" px-2 py-3 text-center  font-medium border border-gray-300 dark:border-gray-600">
              <span className="hidden xs:inline p-3 text-sm">YCOINS</span>
              <span className="xs:hidden text-xs">YC</span>
            </th>
            <th className=" px-2 py-3 text-center font-medium border border-gray-300 dark:border-gray-600">
              <span className="hidden xs:inline p-3 text-sm">CORRECT</span>
              <span className="xs:hidden text-xs">C</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#132750] divide-y divide-gray-200">
          {displayedUsers.map((user, index) => (
            <tr key={index}>
              <td className="text-xs text-center px-2 py-3 border border-gray-300 dark:border-gray-600">
                {isSmallScreen ? index + 2 : index + 4}
              </td>
              <td className="text-xs text-left px-3 py-3 border border-gray-300 dark:border-gray-600">
                {user.username}
              </td>
              <td className="text-xs text-center px-3 py-3 border border-gray-300 dark:border-gray-600">
                {user.points.toFixed(2)}
              </td>
              <td className="text-xs text-center px-3 py-3 border border-gray-300 dark:border-gray-600">
                {user.correctPredictions}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PredictionLeaderboard;
