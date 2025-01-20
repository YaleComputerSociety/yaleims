import React, { useEffect, useState } from "react";
import Image from "next/image";
import { FaCaretDown, FaCaretUp } from "react-icons/fa";

type College = {
  id: string;
  name: string;
  points: number;
  wins: number;
  ties: number;
  losses: number;
  forfeits: number;
  rank: number;
  prevRank: number;
};

type YearlyLeaderboardTableProps = {
  colleges: College[];
  onCollegeClick: (collegeName: string) => void;
};

const YearlyLeaderboardTable: React.FC<YearlyLeaderboardTableProps> = ({
  colleges,
  onCollegeClick,
}) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Check screen size based on Tailwind's `sm` breakpoint (640px)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 569px)");
    const handleScreenChange = () => setIsSmallScreen(mediaQuery.matches);

    // Set initial value and add listener
    handleScreenChange();
    mediaQuery.addEventListener("change", handleScreenChange);

    // Cleanup
    return () => mediaQuery.removeEventListener("change", handleScreenChange);
  }, []);

  // Filter colleges based on screen size
  const displayedColleges = isSmallScreen
    ? colleges.slice(1, 14) // Show top 8 colleges for small screens
    : colleges.slice(3, 14);

  return (
    <div className="overflow-x-auto">
      <table className="w-11/12 xs:max-w-[90%] mx-auto border-collapse border border-gray-300 dark:border-gray-800 divide-y divide-gray-200">
        <thead className="bg-white dark:bg-[#132750]">
          <tr className="hidden md:table-row">
            <th className="px-6 py-3 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              RANK
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium border border-gray-300 dark:border-gray-600">
              COLLEGE
            </th>
            <th className="px-6 py-3 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              WINS
            </th>
            <th className="px-6 py-3 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              TIES
            </th>
            <th className="px-6 py-3 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              LOSSES
            </th>
            <th className="px-6 py-3 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              FORFEITS
            </th>
            <th className="px-6 py-3 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              TOTAL PTS
            </th>
          </tr>
          <tr className="md:hidden">
            <th className="xs:px-5 px-2 py-2 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              R
            </th>
            <th className="xs:px-5 px-2 py-2 text-left text-sm font-medium border border-gray-300 dark:border-gray-600">
              COLLEGE
            </th>
            <th className="xs:px-5 px-2 py-2 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              W
            </th>
            <th className="xs:px-5 px-2 py-2 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              T
            </th>
            <th className="xs:px-5 px-2 py-2 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              L
            </th>
            <th className="xs:px-5 px-2 py-2 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              F
            </th>
            <th className="xs:px-5 px-2 py-2 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
              PTS
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#132750] divide-y divide-gray-200">
          {displayedColleges.map((college) => (
            <tr
              key={college.id}
              onClick={() => onCollegeClick(college.name)}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer h-12"
            >
              <td className="md:w-[50px] w-[20px] text-xs font-medium border border-gray-300 dark:border-gray-600 text-center">
                <div className="flex flex-col items-center">
                  {college.prevRank - college.rank > 0 && (
                    <FaCaretUp style={{ color: "00C707" }} />
                  )}
                  {college.rank}
                  {college.prevRank - college.rank < 0 && (
                    <FaCaretDown style={{ color: "DF2C2C" }} />
                  )}
                </div>
              </td>
              <td className=" md:w-[120px] w-[30px] text-xs border border-gray-300 dark:border-gray-600">
                <div className="ml-1 xs:ml-2 flex items-center whitespace-normal break-words">
                  <Image
                    src={`/college_flags/${college.name.replace(
                      /\s+/g,
                      " "
                    )}.png`}
                    alt={college.name}
                    width={20}
                    height={20}
                    className="mr-1 xs:mr-2 object-contain"
                    unoptimized
                  />
                  {college.name}
                </div>
              </td>
              <td className="md:w-[75px] w-[15px] text-xs text-center border border-gray-300 dark:border-gray-600">
                {college.wins}
              </td>
              <td className="md:w-[75px] w-[15px] text-xs text-center border border-gray-300 dark:border-gray-600">
                {college.ties}
              </td>
              <td className="md:w-[75px] w-[15px] text-xs text-center border border-gray-300 dark:border-gray-600">
                {college.losses}
              </td>
              <td className="md:w-[75px] w-[15px] text-xs text-center border border-gray-300 dark:border-gray-600">
                {college.forfeits}
              </td>
              <td className="md:w-[150px] w-[40px] text-xs text-center border border-gray-300 dark:border-gray-600">
                {college.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default YearlyLeaderboardTable;
