"use client";

import { useEffect, useState, useContext } from 'react';
import { matches, Match } from '../../data/previousMatches';
import { colleges } from '../../data/colleges';
import { sports } from '../../data/sports';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LoadingScreen from '@src/components/LoadingScreen';
import { FiltersContext } from "@src/context/FiltersContext";


const ScoresPage: React.FC = () => {
  const filtersContext = useContext(FiltersContext);
  const { filter, setFilter } = filtersContext;
  const router = useRouter();
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [rank, setRank] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // change title of page
  useEffect(() => {
    document.title = "Scores";
  }, []);

  useEffect(() => {
    // Display the loading screen
    setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Wait for 1 second and then hide the loading screen
    
    // Get a selected college from session storage
    const selectedCollege = sessionStorage.getItem("selectedCollege");
    if (selectedCollege) {
      setFilter((prev) => ({ ...prev, college: selectedCollege }));
    }
  }, []);

  useEffect(() => {
    const filtered = Object.values(matches).filter((match) => {
      const collegeMatch = filter.college
        ? [match.college1, match.college2].includes(filter.college)
        : true;
      const sportMatch = filter.sport ? match.sport === filter.sport : true;
      const dateMatch = filter.date ? match.date === filter.date : true;
      return collegeMatch && sportMatch && dateMatch;
    });

    setFilteredMatches(filtered);
    if (filter.college) {
      calculateCollegeStats(filter.college, filtered);
    }
  }, [filter]);

  const calculateCollegeStats = (college: string, matches: Match[]) => {
    const points = matches.reduce((total: number, match) => {
      const sportPoints = match.sport === "Soccer" ? 11 : 6; // Adjust this as necessary
      if (match.winner === college) {
        return total + sportPoints; // Full points for win
      } else if (match.winner === "Tie") {
        return total + sportPoints / 2; // Half points for tie
      } else {
        return total; // Zero points for loss or forfeit
      }
    }, 0);

    const games = matches.filter(
      (match) => match.college1 === college || match.college2 === college
    ).length;

    setTotalPoints(points);
    setGamesPlayed(games);

    // Placeholder rank logic, adjust as needed
    setRank(1); // Assume rank 1 for now
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  // change the college filter to collegeName
  const handleCollegeClick = (collegeName: string) => {
    setFilter((prev) => ({ ...prev, college: collegeName }));
  };

  // change sport filter to sportName
  const handleSportClick = (sportName: string) => {
    setFilter((prev) => ({ ...prev, sport: sportName }));
  };

  // Function to handle clicking on a college
  const handleScheduleButton = (collegeName: string) => {
    // Store the selected college in session storage
    sessionStorage.setItem('selectedCollege', collegeName);
    router.push('/schedule');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        Scores and Rankings
      </h1>

      {/* Filters */}
      <div className="mb-8 flex space-x-4 justify-center">
        <select
          name="college"
          value={filter.college}
          onChange={handleFilterChange}
          className="p-2 border border-gray-300 rounded-lg"
        >
          <option value="">Filter by College</option>
          {Object.values(colleges).map((college) => (
            <option key={college.id} value={college.name}>
              {college.name}
            </option>
          ))}
        </select>

        <select
          name="sport"
          value={filter.sport}
          onChange={handleFilterChange}
          className="p-2 border border-gray-300 rounded-lg"
        >
          <option value="">Filter by Sport</option>
          {Object.values(sports).map((sport) => (
            <option key={sport.id} value={sport.name}>
              {sport.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="date"
          value={filter.date}
          onChange={handleFilterChange}
          className="p-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* College Summary (only displayed if a college is filtered) */}
      {filter.college && (
        <div className="mb-8 bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto text-center flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold mb-4">{filter.college} Overview</h2>
          <Image
            src={`/college_flags/${filter.college}.png`}
            alt={`${filter.college}_flag`}
            width="64"
            height="64"
          />
          <div className="text-xl text-gray-700 mb-4">
            <p>
              Total Points:{" "}
              <span className="font-semibold text-blue-600">{totalPoints}</span>
            </p>
            <p>
              Games Played:{" "}
              <span className="font-semibold text-blue-600">{gamesPlayed}</span>
            </p>
            <p>
              Rank: <span className="font-semibold text-blue-600">{rank}</span>
            </p>

            {/* See schedule button*/}
            <div className="text-center mb-0">
              <button
                // onClick={handleViewToggle}
                onClick={() => handleScheduleButton(filter.college)}
                className="px-6 py-2 mt-5 bg-blue-600 text-white rounded-lg"
              >
                Schedule
              </button>
            </div>


          </div>
        </div>
      )}

      {/* Matches Table */}
      <table className="min-w-full bg-white shadow-md rounded-lg">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date/Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              College 1
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              College 2
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sport
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredMatches.map((match, index) => {
            const college1Style =
              match.winner === match.college1
                ? "text-green-500"
                : match.winner === "Tie"
                ? "text-yellow-500"
                : match.winner === "Forfeit"
                ? "text-gray-500"
                : "text-red-500";
            const college2Style =
              match.winner === match.college2
                ? "text-green-500"
                : match.winner === "Tie"
                ? "text-yellow-500"
                : match.winner === "Forfeit"
                ? "text-gray-500"
                : "text-red-500";

            const college1Status: string =
              match.winner === match.college1
                ? "W"
                : match.winner === "Tie"
                ? "T"
                : match.winner === "Forfeit"
                ? "F"
                : "L";

            const college2Status: string =
              match.winner === match.college2
                ? "W"
                : match.winner === "Tie"
                ? "T"
                : match.winner === "Forfeit"
                ? "F"
                : "L";

            return (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {match.date} {match.time}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap hover:cursor-pointer hover:bg-gray-100`}
                  onClick={() => handleCollegeClick(match.college1)}
                >
                  <div className="flex justify-between">
                    <span>{match.college1}</span>
                    <span className={`${college1Style}`}>{college1Status}</span>
                  </div>
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap hover:cursor-pointer hover:bg-gray-100`}
                  onClick={() => handleCollegeClick(match.college2)}
                >
                  <div className="flex justify-between">
                    <span>{match.college2}</span>
                    <span className={`${college2Style}`}>{college2Status}</span>
                  </div>
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap hover:cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSportClick(match.sport)}
                >
                  {match.sport}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
  
export default ScoresPage;
