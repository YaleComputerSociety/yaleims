"use client";

import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoadingScreen from "@src/components/LoadingScreen";
import { FiltersContext } from "@src/context/FiltersContext";
import { toCollegeName, sportsMap, emojiMap, toCollegeAbbreviation } from "@src/data/helpers";

type Match = {
  id: string; // Unique identifier for the match
  home_college: string; // Abbreviation of the home college
  away_college: string; // Abbreviation of the away college
  home_college_score: number; // Score of the home college
  away_college_score: number; // Score of the away college
  home_college_participants: [];
  away_college_participants: [];
  sport: string; // The sport played in the match (e.g., "Flag Football")
  timestamp: string; // Date and time of the match, in ISO format or UNIX timestamp
  location: string; // The location where the match was played (optional)
  winner: string; // Determines the winner, or if it's a draw
};

interface TableRowProps {
  match: Match; // match prop should be typed as a Match
  onShowParticipants: (match: Match) => void; // onShowParticipants function prop
}

interface MatchesTableProps {
  filteredMatches: Match[]; // Type the filteredMatches prop as an array of Match
}

const ScoresPage: React.FC = () => {
  const filtersContext = useContext(FiltersContext);
  const { filter, setFilter } = filtersContext;
  const router = useRouter();
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  // const [rank, setRank] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [originalData, setOriginalData] = useState([])

  // change title of page
  useEffect(() => {
    document.title = "Scores";
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    // const selectedCollege = sessionStorage.getItem("selectedCollege");
    // if (selectedCollege) {
    //   setFilter((prev) => ({ ...prev, college: selectedCollege }));
    // }
  }, []);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await fetch(
          "https://us-central1-yims-125a2.cloudfunctions.net/getMatches?type=past", // Pass 'type=past' to get past matches
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching scores: ${response.statusText}`);
        }

        const data = await response.json();
        setOriginalData(data);
        setFilteredMatches(data);
        console.log(data)
      } catch (error) {
        console.error("Failed to fetch scores:", error);
      }
    };

    fetchScores();
  }, []); // Add filter as a dependency to re-fetch when the filter changes

  const filterCollege = (college: string) => {
    console.log(college)
    if (college == "All") {
      setFilteredMatches(originalData)
    } else {
      const filtered = originalData.filter((match: Match) => {
        return match.home_college == college || match.away_college == college
      });
      setFilteredMatches(filtered);
    }
  };

  const calculateCollegeStats = (college: string, matches: any[]) => {
    const points = matches.reduce((total: number, match) => {
      const sportPoints = match.sport === "Soccer" ? 11 : 6; // Adjust as necessary
      if (match.winner === college) {
        return total + sportPoints; // Full points for win
      } else if (match.winner === "Tie") {
        return total + sportPoints / 2; // Half points for tie
      } else {
        return total; // Zero points for loss or forfeit
      }
    }, 0);

    const games = matches.filter(
      (match) =>
        match.home_college === college || match.away_college === college
    ).length;

    setTotalPoints(points);
    setGamesPlayed(games);

    // Placeholder rank logic
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
    filterCollege(value)
  };

  const handleCollegeClick = (collegeName: string) => {
    setFilter((prev) => ({ ...prev, college: collegeName }));
  };

  const handleScheduleButton = (collegeName: string) => {
    sessionStorage.setItem("selectedCollege", collegeName);
    router.push("/schedule");
  };

  const onShowParticipants = () => {
    console.log("TODO");
  };

  const groupByDate = (allMatches: Match[]) => {
    const groupedData: { [key: string]: Match[] } = {};

    allMatches.forEach((item) => {
      const date: string = new Date(item.timestamp).toLocaleDateString(
        "en-CA",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      );
      // console.log(date)
      if (!groupedData[date]) {
        groupedData[date] = [];
      }
      groupedData[date].push(item);
    });

    return groupedData;
  };

  // Updated TableHeader Component
  const TableHeader = () => (
    <div className="flex px-2 py-2 rounded-md justify-center justify-self-center">
      {/* Date/Time Column with Dropdown Filter */}
      <div className="py-1 px-1 text-xs font-medium rounded-md text-gray-500 uppercase md:tracking-wider hover:bg-yellow-400">
        <div>
          <select
            name="date"
            onChange={handleFilterChange}
            className="text-xs md:text-sm rounded-md py-1 px-1"
          >
            <option value="all">Date/Time</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
          </select>
        </div>
      </div>

      {/* Colleges & Score Column with Dropdown Filter */}
      <div className="py-1 px-1 text-xs font-medium rounded-md text-gray-500 uppercase md:tracking-wider hover:bg-yellow-400">
        <div>
          <select
            name="college"
            onChange={handleFilterChange}
            className="text-xs md:text-sm rounded-md py-1 px-1"
          >
            <option value="">Colleges</option>
            <option value="BF">Benjamin Franklin</option>
            <option value="BR">Berkeley</option>
            <option value="BR">Branford</option>
            <option value="DC">Davenport</option>
            <option value="ES">Ezra Stiles</option>
            <option value="GH">Grace Hopper</option>
            <option value="JE">Jonathan Edwards</option>
            <option value="MC">Morse</option>
            <option value="MY">Pauli Murray</option>
            <option value="PC">Pierson</option>
            <option value="SB">Saybrook</option>
            <option value="SI">Silliman</option>
            <option value="TD">Timothy Dwight</option>
            <option value="TR">Trumbull</option>
          </select>
        </div>
      </div>

      {/* Sport Column with Dropdown Filter */}
      <div className="py-1 px-1 text-xs font-medium rounded-md text-gray-500 uppercase md:tracking-wider hover:bg-yellow-400">
        <div>
          <select
            name="sport"
            onChange={handleFilterChange}
            className="text-xs md:text-sm rounded-md py-1 px-1"
          >
            <option value="">All Sport</option>
            <option value="Flag Football">Flag Football</option>
            <option value="Spikeball">Spikeball</option>
            <option value="Cornhole">Cornhole</option>
            <option value="Pickleball">Pickleball</option>
            <option value="Table Tennis">Table Tennis</option>
          </select>
        </div>
      </div>
    </div>
  );

  // Updated TableRow Component
  const TableRow: React.FC<TableRowProps> = ({ match, onShowParticipants }) => (
    <div className="bg-white grid grid-cols-[auto_1fr_auto] items-center">
      <div className="md:px-6 pl-2 py-4 text-xs md:text-sm text-gray-500">
        {new Date(match.timestamp).toLocaleString("en-US", {
          hour: "2-digit", // "04"
          minute: "2-digit", // "00"
          hour12: true, // "AM/PM"
        })}
      </div>

      {/* Combine Colleges and Scores into one column */}
      <div className="text-left md:px-6 py-4 px-3 text-sm grid md:grid-cols-[0.7fr_0.7fr_0.3fr] md:grid-rows-1 grid-rows-2 grid-flow-col gap-2 items-center">
        {/* Determine the winner and loser */}
        {match.home_college_score > match.away_college_score ? (
          // Home college wins
          <>
            <div className="items-start text-xs md:text-sm">
              <strong
                className="cursor-pointer text-black flex items-center"
                onClick={() => handleCollegeClick(match.home_college)} // Replace with your function
              >
                <Image
                  src={`/college_flags/${
                    toCollegeName[match.home_college]
                  }.png`}
                  alt={match.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[match.home_college]}
                <span className="text-yellow-500 text-xs">
                  +{sportsMap[match.sport]}pts
                </span>
              </strong>
            </div>
            {match.away_college != "Bye" ? (
              <div
                className={`${
                  match.away_college === "" ? "hidden" : "block"
                } items-start text-xs md:text-sm`}
              >
                <strong
                  className="cursor-pointer text-black flex items-center text-gray-400"
                  onClick={() => handleCollegeClick(match.away_college)} // Replace with your function
                >
                  <Image
                    src={`/college_flags/${
                      toCollegeName[match.away_college]
                    }.png`}
                    alt={match.away_college}
                    width={20}
                    height={20}
                    className="mr-2 object-contain"
                    unoptimized
                  />
                  {toCollegeName[match.away_college]}
                </strong>
              </div>
            ) : (
              <div className="pl-7 font-bold">BYE</div>
            )}
            <div className="text-left hidden md:block">
              <strong>
                {match.home_college_score ? match.home_college_score : 0}
              </strong>
              -
              <strong className="text-gray-400">
                {match.away_college_score ? match.away_college_score : 0}
              </strong>
            </div>
            <div className="text-right md:hidden text-xs">
              <strong>
                {match.home_college_score ? match.home_college_score : 0}
              </strong>
            </div>
            <div className="text-right md:hidden text-xs">
              <strong className="text-gray-400">
                {match.away_college_score ? match.away_college_score : 0}
              </strong>
            </div>
          </>
        ) : match.home_college_score < match.away_college_score ? (
          // Away college wins
          <>
            <div className="items-start text-xs md:text-sm">
              <strong
                className="cursor-pointer text-gray-400 flex items-center"
                onClick={() => handleCollegeClick(match.home_college)} // Replace with your function
              >
                <Image
                  src={`/college_flags/${
                    toCollegeName[match.home_college]
                  }.png`}
                  alt={match.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[match.home_college]}
              </strong>
            </div>
            <div
              className={`${
                match.away_college === "" ? "hidden" : "block"
              } items-start text-xs md:text-sm `}
            >
              <strong
                className="cursor-pointer text-black flex items-center"
                onClick={() => handleCollegeClick(match.away_college)} // Replace with your function
              >
                <Image
                  src={`/college_flags/${
                    toCollegeName[match.away_college]
                  }.png`}
                  alt={match.away_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[match.away_college]}
                <span className="text-yellow-500 text-xs">
                  +{sportsMap[match.sport]}pts
                </span>
              </strong>
            </div>

            <div className="text-left hidden md:block">
              <strong className="text-gray-400">
                {match.home_college_score ? match.home_college_score : 0}
              </strong>
              -
              <strong>
                {match.away_college_score ? match.away_college_score : 0}
              </strong>
            </div>
            <div className="text-right md:hidden text-xs">
              <strong className="text-gray-400">
                {match.home_college_score ? match.home_college_score : 0}
              </strong>
            </div>
            <div className="text-right md:hidden text-xs">
              <strong>
                {match.away_college_score ? match.away_college_score : 0}
              </strong>
            </div>
          </>
        ) : (
          // Draw
          <>
            <div className="items-start text-xs md:text-sm">
              <strong
                className="cursor-pointer text-gray-400 flex items-center"
                onClick={() => handleCollegeClick(match.home_college)} // Replace with your function
              >
                <Image
                  src={`/college_flags/${
                    toCollegeName[match.home_college]
                  }.png`}
                  alt={match.home_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[match.home_college]}
                <span className="text-yellow-300 text-xs">
                  +{sportsMap[match.sport] / 2}pts
                </span>
              </strong>
            </div>
            <div className="items-start text-xs md:text-sm">
              <strong
                className="cursor-pointer text-gray-400 flex items-center"
                onClick={() => handleCollegeClick(match.away_college)} // Replace with your function
              >
                <Image
                  src={`/college_flags/${
                    toCollegeName[match.away_college]
                  }.png`}
                  alt={match.away_college}
                  width={20}
                  height={20}
                  className="mr-2 object-contain"
                  unoptimized
                />
                {toCollegeName[match.away_college]}
                <span className="text-yellow-300 text-xs">
                  +{sportsMap[match.sport] / 2}pts
                </span>
              </strong>
            </div>
            <div className="text-left hidden md:block">
              <strong className="text-gray-400">
                {match.home_college_score ? match.home_college_score : 0}
              </strong>
              -
              <strong className="text-gray-400">
                {match.away_college_score ? match.away_college_score : 0}
              </strong>
            </div>
            <div className="text-right md:hidden text-xs">
              <strong className="text-gray-400">
                {match.home_college_score ? match.home_college_score : 0}
              </strong>
            </div>
            <div className="text-right md:hidden text-xs">
              <strong className="text-gray-400">
                {match.home_college_score ? match.home_college_score : 0}
              </strong>
            </div>
          </>
        )}
      </div>

      <div className="text-center px-2 py-1">{emojiMap[match.sport]}</div>
    </div>
  );

  // Main MatchesTable Component
  const MatchesTable: React.FC<MatchesTableProps> = ({ filteredMatches }) => {
    const onShowParticipants = (match: Match) => {
      // This could trigger a modal, display a dropdown, or anything else
      console.log("TODO");
    };
    const test = groupByDate(filteredMatches);

    // console.log(test)
    return (
      <>
        {Object.entries(test).map(([date, items]) => (
          <div key={date} className="min-w-full rounded-lg mb-4">
            <div>
              <div className="text-left text-gray-700 p-2 bg-black-100 border-none">
                {date}
              </div>
            </div>
            <div>
              {items.map((match, index) => (
                <TableRow
                  key={index}
                  match={match}
                  onShowParticipants={onShowParticipants}
                />
              ))}
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="min-h-screen  p-8 flex-col items-center">
      <h1 className="md:text-4xl text-xl font-bold text-center mb-8 pt-8">
        Scores and Rankings
      </h1>

      {/* College Summary (only displayed if a college is filtered) */}
      {filter.college && (
        <div className="mb-8 bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto text-center flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold mb-4">
            {toCollegeName[filter.college]} Overview
          </h2>
          <Image
            src={`/college_flags/${toCollegeName[filter.college]}.png`}
            alt={`${toCollegeName[filter.college]}_flag`}
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

            <div className="text-center mb-0">
              <button
                onClick={() => handleScheduleButton(filter.college)}
                className="px-6 py-2 mt-5 bg-blue-600 text-white rounded-lg"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-w-full flex-col items-center md:px-20">
        <TableHeader />

        <MatchesTable filteredMatches={filteredMatches} />
      </div>
      {/* Loading Screen */}
      {isLoading && <LoadingScreen />}
    </div>
  );
};

export default ScoresPage;
