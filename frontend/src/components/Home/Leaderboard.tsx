import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoadingScreen from "../LoadingScreen";
import { FiltersContext } from "@src/context/FiltersContext";
import { toCollegeAbbreviation } from "@src/utils/helpers";
import { FaCaretDown } from "react-icons/fa";
import { FaCaretUp } from "react-icons/fa";
import { TbCaretLeftRightFilled } from "react-icons/tb";
import CPodium from "./Podium";
import Title from "./Title";

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
        setSortedColleges(() => sorted);
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

  if (loading) {
    return (
      <div className="text-center py-10">
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden w-full sm:max-w-5xl mx-auto">
      {/* Podium */}
      <div className="hidden xs:block">
        <Title />
      </div>

      <div className="xs:hidden text-blue-700 dark:text-white">
        <h1 className="text-center font-bold text-2xl  mt-2">
          TYNG CUP STANDINGS
        </h1>
        <div className="flex flex-row mb-8 justify-between w-3/4 mx-auto items-center">
          <button className="border-solid border-2 p-1 border-blue-600 dark:border-white rounded-lg text-sm font-bold">
            2024-2025
          </button>
          <h2 className="mt-4 text-right text-xs font-extralight  underline mb-4 ">
            Every point, every game, <br></br>every play matters.
          </h2>
        </div>
      </div>

      <div className="flex justify-center sm:gap-x-6 md:gap-x-12 items-end md:max-w-[80%] max-w-[60%] mx-auto">
        <CPodium
          posHeight="h-48 w-40"
          imgSrc={`/college_flags/${sortedColleges[2].name}.png`}
          overlaySrc="/college_flags/bronze_overlay.png"
          imgsConfig="mg:h-[170px] h-[150px]"
          overlayHeight={160}
          overlayWidth={160}
          overlayConfig="mg:h-[190px] mg:w-[165px] h-[150px] w-[120px]"
          college={sortedColleges[2]}
          onSelect={handleCollegeClick}
        />
        <CPodium
          posHeight="h-40 xs:h-64 w-56 xs:w-44"
          imgSrc={`/college_flags/${sortedColleges[0].name}.png`}
          overlaySrc="/college_flags/gold_overlay.png"
          imgsConfig="mg:h-[170px] h-[150px]"
          overlayHeight={400}
          overlayWidth={400}
          overlayConfig="mg:h-[190px] mg:w-[210px] h-[150px] w-[170px]"
          college={sortedColleges[0]}
          onSelect={handleCollegeClick}
        />
        <CPodium
          posHeight="h-52 w-40"
          imgSrc={`/college_flags/${sortedColleges[1].name}.png`}
          overlaySrc="/college_flags/silver_overlay.png"
          imgsConfig="mg:h-[160px] h-[140px]"
          overlayHeight={160}
          overlayWidth={160}
          overlayConfig="mg:h-[190px] mg:w-[165px] h-[150px] w-[120px]"
          college={sortedColleges[1]}
          onSelect={handleCollegeClick}
        />
      </div>

      {/* Full Leaderboard */}
      <div className="overflow-x-auto ">
        <table className="w-11/12 xs:max-w-[90%] mx-auto border-collapse border border-gray-300 dark:border-gray-800 divide-y divide-gray-200">
          <thead className="bg-white dark:bg-[#132750]">
            <tr className="hidden md:table-row">
              <th className="px-6 py-3 text-center text-sm font-medium border border-gray-300 dark:border-gray-600">
                RANK
              </th>
              <th className="px-6 py-3 text-leftCAM text-sm font-medium border border-gray-300 dark:border-gray-600">
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
            {sortedColleges.slice(1).map((college, index) => (
              <tr
                key={college.id}
                onClick={() => handleCollegeClick(college.name)}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                  college.rank > 1 && college.rank < 4 ? "md:hidden" : ""
                }`}
              >
                <td
                  className={`md:w-[50px] w-[40px] text-xs xs:test:sm font-medium border border-gray-300 dark:border-gray-600 text-center`}
                >
                  <div className="flex flex-col items-center">
                    {college.prevRank - college.rank > 0 && (
                      <FaCaretUp style={{ color: "00C707" }} />
                    )}
                    {college.rank}
                    {college.prevRank - college.rank < 0 && (
                      <FaCaretDown style={{ color: "DF2C2C" }} />
                    )}
                    {/* maybe can display this for draw? {(college.prevRank - college.rank === 0) && <TbCaretLeftRightFilled style={{ color: 'ash' }} />} */}
                  </div>
                </td>
                <td className="md:w-[120px] w-30px text-xs xs:test:sm border border-gray-300 dark:border-gray-600">
                  <div className="ml-2 flex items-center whitespace-normal break-words">
                    <Image
                      src={`/college_flags/${college.name.replace(
                        /\s+/g,
                        " "
                      )}.png`}
                      alt={college.name}
                      width={24}
                      height={24}
                      className="mr-2 object-contain md:h-[24px] md:w-[24px] h-6 w-6"
                      unoptimized
                    />
                    {college.name}
                  </div>
                </td>
                <td className="md:w-[75px] w-[20px] text-xs xs:test:sm text-center border border-gray-300 dark:border-gray-600">
                  {college.wins}
                </td>
                <td className="md:w-[75px] w-[20px] text-xs xs:test:sm text-center border border-gray-300 dark:border-gray-600">
                  {college.ties}
                </td>
                <td className="md:w-[75px] w-[20px]  text-xs xs:test:sm text-center border border-gray-300 dark:border-gray-600">
                  {college.losses}
                </td>
                <td className="md:w-[75px] w-[20px]  text-xs xs:test:sm text-center border border-gray-300 dark:border-gray-600">
                  {college.forfeits}
                </td>
                <td className="md:w-[150px] w-50px md:px-6 md:py-4 px-2 py-2 text-xs xs:test:sm text-center border border-gray-300 dark:border-gray-600">
                  {college.points}
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
