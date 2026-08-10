import React, { useEffect, useState } from "react";
import Image from "next/image";
import { FaCaretDown, FaCaretUp } from "react-icons/fa";
import { getCollegeFlag } from "@/utils/versionedImages";

export type RankingEntry = {
  id: string;
  name: string;
  elo: number;
  rank: number;
  prevRank?: number;
};

interface RankingsTableProps {
  rankings: RankingEntry[];
  title?: string;
}

const RankingsTable: React.FC<RankingsTableProps> = ({ rankings, title }) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 569px)");
    const handleScreenChange = () => setIsSmallScreen(mediaQuery.matches);

    handleScreenChange();
    mediaQuery.addEventListener("change", handleScreenChange);

    return () => mediaQuery.removeEventListener("change", handleScreenChange);
  }, []);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700">
        <table className="w-full border-collapse">
          <thead className="bg-gradient-to-r from-blue-500/10 to-blue-400/10 dark:from-blue-900/30 dark:to-blue-800/30">
            <tr>
              <th className="px-5 py-3 text-center text-sm font-semibold border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                RANK
              </th>
              <th className="px-5 py-3 text-left text-sm font-semibold border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                COLLEGE
              </th>
              <th className="px-5 py-3 text-center text-sm font-semibold border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                ELO RATING
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#132750]/50 divide-y divide-gray-200 dark:divide-gray-700">
            {rankings.map((entry, idx) => (
              <tr
                key={entry.id}
                className={`hover:bg-gray-50 dark:hover:bg-blue-900/20 transition-colors h-14 ${
                  idx < 3 ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                }`}
              >
                <td className="px-5 py-3 text-center text-sm font-medium border-r border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col items-center">
                    {entry.prevRank && entry.prevRank - entry.rank > 0 && (
                      <FaCaretUp style={{ color: "#00C707" }} size={16} />
                    )}
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      #{entry.rank}
                    </span>
                    {entry.prevRank && entry.prevRank - entry.rank < 0 && (
                      <FaCaretDown style={{ color: "#DF2C2C" }} size={16} />
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-sm border-r border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Image
                      src={getCollegeFlag(entry.name)}
                      alt={entry.name}
                      width={24}
                      height={24}
                      className="object-contain"
                      unoptimized
                    />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {entry.name}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                    {entry.elo}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RankingsTable;
