import React, { useEffect, useState } from "react";
import Image from "next/image";
import { allTimeStandings } from "@src/utils/helpers";

const AllTimeLeaderboard: React.FC = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 569px)");
    const handleScreenChange = () => setIsSmallScreen(mediaQuery.matches);

    // Set initial value and add listener
    handleScreenChange();
    mediaQuery.addEventListener("change", handleScreenChange);

    // Cleanup
    return () => mediaQuery.removeEventListener("change", handleScreenChange);
  }, []);

  // Determine the slice of standings to display
  const displayedStandings = isSmallScreen
    ? allTimeStandings.slice(1, 14) // Small screens
    : allTimeStandings.slice(3, 14); // Larger screens

  return (
    <div className="overflow-x-auto">
      <table className="w-11/12 xs:max-w-[90%] mx-auto border-collapse border border-gray-300 dark:border-gray-800 divide-y divide-gray-200">
        <thead className="bg-white dark:bg-[#132750]">
          <tr>
            <th className="px-4 py-4 text-center text-xs xs:text-sm font-medium border border-gray-300 dark:border-gray-600">
              RANK
            </th>
            <th className="px-4 py-4 text-left text-xs xs:text-sm font-medium border border-gray-300 dark:border-gray-600">
              COLLEGE
            </th>
            <th className="px-4 py-4 text-center text-xs xs:text-sm font-medium border border-gray-300 dark:border-gray-600">
              TYNG CUP WINS
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#132750] divide-y divide-gray-200">
          {displayedStandings.map((college, key) => (
            <tr key={key}>
              <td className="text-center px-6 py-3 border border-gray-300 dark:border-gray-600">
                {isSmallScreen ? key + 2 : key + 4}
              </td>
              <td className="text-xs border border-gray-300 dark:border-gray-600">
                <div className="ml-2 flex xs:ml-5 items-center whitespace-normal break-words">
                  <Image
                    src={`/college_flags/${college[0]}.png`}
                    alt=""
                    width={24}
                    height={24}
                    className="mr-2 object-contain"
                    unoptimized
                  />
                  {college[0]}
                </div>
              </td>
              <td className="text-center px-6 py-3 border border-gray-300 dark:border-gray-600">
                {college[1]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AllTimeLeaderboard;
