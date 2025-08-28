import React, { useEffect, useState } from "react";
import { useSeason } from "@src/context/SeasonContext";
interface Users {
  rank: number;
  username: string;
  points: number;
  correctPredictions: number;
}

const PredictionLeaderboard = () => {
  const [sortedUsers, setSortedUsers] = useState<Users[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { currentSeason } = useSeason();


  useEffect(() => {
    async function fetchLeaderboard() {
      setLoadingUsers(true);
      try {
        const response = await fetch(
          `https://us-central1-yims-125a2.cloudfunctions.net/getUserLeaderboard?${currentSeason?.year}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Error fetching users leaderboard: ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log(data)
        setSortedUsers(() => data);
      } catch (error) {
        console.error("Failed to fetch users leaderboard:", error);
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchLeaderboard();
  }, []);

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
          {sortedUsers.map((user, index) => (
            <tr key={index}>
              <td className="text-xs text-center px-2 py-3 border border-gray-300 dark:border-gray-600">
                {index + 1}
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
