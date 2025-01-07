import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoadingScreen from "../LoadingScreen";
import { FiltersContext } from "@src/context/FiltersContext";
import { toCollegeAbbreviation } from "@src/utils/helpers";
import Podium from "@src/components/home/Podium";

const Leaderboard: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [sortedColleges, setSortedColleges] = useState<any[]>([]);
  const { setFilter } = useContext(FiltersContext);

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

              <h3 className="font-semibold text-sm mt-10 text-center">
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
    <div className="rounded-lg overflow-hidden max-w-6xl mx-auto relative">
      {/* Podium */}
      {/* <div className="py-6">{renderPodium(sortedColleges.slice(0, 3)http://localhost:3000/confetti.png)}</div> */}
      {/* Overlay Image */}
      <h1 className="text-blue-700 text-6xl mt-4 absolute md:ml-10 ml-3 font-bold">
        TYNG CUP<br></br>STANDINGS
      </h1>
      <div className="absolute inset-5 w-full h-full flex justify-center z-10">
        <Image
          src="/confetti2.png"
          width={940}
          height={940}
          alt="Confetti"
          className="object-contain object-top z-10 min-w-[994px] min-h-[994px]"
        />
      </div>

      <div className="mt-10">
        <Podium colleges={sortedColleges.slice(0, 3)} />
      </div>

      {/* Full Leaderboard */}
      <div className="overflow-x-auto -mt-4">
        <table className="w-full max-w-[90%] mx-auto border-collapse border border-gray-300 dark:border-gray-800 divide-y divide-gray-200 ">
          <thead className="bg-white dark:bg-[#132750]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium border border-gray-300 dark:border-gray-600">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium border border-gray-300 dark:border-gray-600">
                College
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium border border-gray-300 dark:border-gray-600">
                Change?
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium border border-gray-300 dark:border-gray-600">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#132750] divide-y divide-gray-200">
            {sortedColleges.slice(3).map((college, index) => (
              <tr
                key={college.id}
                onClick={() => handleCollegeClick(college.name)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <td className="w-[50px] text-sm font-medium border border-gray-300 dark:border-gray-600 text-center">
                  {index + 4}
                </td>
                <td className="px-6 py-4 text-sm border border-gray-300 dark:border-gray-600">
                  <div className="flex items-center">
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
                  </div>
                </td>
                <td className="w-[75px] text-sm text-center border border-gray-300 dark:border-gray-600">
                  -0
                </td>
                <td className="w-[150px] px-6 py-4 text-sm border border-gray-300 dark:border-gray-600">
                  {college.points} points
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
