import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoadingScreen from "../LoadingScreen";
import { toCollegeAbbreviation } from "@src/utils/helpers";

import { FiltersContext } from "@src/context/FiltersContext";

const Leaderboard: React.FC = () => {
  const { setFilter } = useContext(FiltersContext);

  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [sortedColleges, setSortedColleges] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(
          "https://us-central1-yims-125a2.cloudfunctions.net/getLeaderboard",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching leaderboard: ${response.statusText}`);
        }

        const data = await response.json();
        const sorted = data.sort((a: any, b: any) => b.points - a.points);
        setSortedColleges(sorted);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const handleCollegeClick = (collegeName: string) => {
    setFilter({
      college: toCollegeAbbreviation[collegeName],
      sport: "",
      date: "",
      selected: ""
    });
    router.push("/scores");
  };

  const renderPodium = (topColleges: any) => {
    const podiumItems = [
      {
        place: "second",
        college: topColleges[1],
        size: "small",
        offset: "translate-y-6",
      },
      {
        place: "first",
        college: topColleges[0],
        size: "large",
        offset: "translate-y-0",
      },
      {
        place: "third",
        college: topColleges[2],
        size: "small",
        offset: "translate-y-6",
      },
    ];

    const mobilePodiumItems = [
      {
        place: "first",
        college: topColleges[0],
        size: "large",
        offset: "translate-y-0",
      },
    ];

    return (
      <div className="flex flex-row justify-center md:gap-10 items-end space-x-6">
        {podiumItems.map(({ place, college, size, offset }, index) =>
          college ? (
            <div
              key={index}
              onClick={() => handleCollegeClick(college.name)}
              className={`flex flex-col items-center ${offset}text-center mb-3 cursor-pointer`}
            >
              <div
                className={`relative ${
                  size === "large" ? "w-52 h-52" : "w-24 h-24"
                } flex items-center justify-center mb-4`}
              >
                {/* Main College Flag */}
                <Image
                  src={`/college_flags/${college.name.replace(
                    /\s+/g,
                    " "
                  )}.png`}
                  alt={college.name}
                  width={size === "large" ? 160 : 96}
                  height={size === "large" ? 160 : 96}
                  className="object-contain p-3"
                />

                {/* Overlay Image */}
                <Image
                  src={`/college_flags/${place}.png`}
                  alt={`${place} Place Overlay`}
                  width={size === "large" ? 400 : 50}
                  height={size === "large" ? 400 : 50}
                  layout="fixed"
                  className={`absolute ${
                    place === "first" ? "top-10" : "top-20"
                  }`}
                />
              </div>

              <h3 className="font-semibold text-sm text-gray-800 mt-10 text-center">
                {college.name}
              </h3>
              <p className="text-sm text-gray-500">Points: {college.points}</p>
            </div>
          ) : null
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Podium */}

      <div className="py-6">{renderPodium(sortedColleges.slice(0, 1))}</div>

      {/* Full Leaderboard */}
      <table className="min-w-full divide-y divide-gray-200 mt-4">
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedColleges.slice(1).map((college, index) => (
            <tr
              key={college.id}
              onClick={() => handleCollegeClick(college.name)}
              className="hover:bg-gray-100 cursor-pointer"
            >
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {index + 2}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 flex items-center">
                <Image
                  src={`/college_flags/${college.name.replace(
                    /\s+/g,
                    " "
                  )}.png`}
                  alt={college.name}
                  width={24}
                  height={24}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {college.name}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {college.points} points
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
