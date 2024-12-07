"use client"

import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LoadingScreen from '@src/components/LoadingScreen';
import { FiltersContext } from '@src/context/FiltersContext';
import { toCollegeName, sportsMap, emojiMap } from '@src/data/helpers';

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
  const [rank, setRank] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // change title of page
  useEffect(() => {
    document.title = 'Scores';
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    const selectedCollege = sessionStorage.getItem('selectedCollege');
    if (selectedCollege) {
      setFilter((prev) => ({ ...prev, college: selectedCollege }));
    }
  }, []);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await fetch(
          'https://us-central1-yims-125a2.cloudfunctions.net/getMatches?type=past', // Pass 'type=past' to get past matches
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
  
        if (!response.ok) {
          throw new Error(`Error fetching scores: ${response.statusText}`);
        }
  
        const data = await response.json();
        const filtered = data.filter((match: any) => {
          const collegeMatch = filter.college
            ? [match.home_college, match.away_college].includes(filter.college)
            : true;
          const sportMatch = filter.sport ? match.sport === filter.sport : true;
          const dateMatch = filter.date ? match.timestamp === filter.date : true;
          return collegeMatch && sportMatch && dateMatch;
        });
  
        setFilteredMatches(filtered);
        if (filter.college) {
          calculateCollegeStats(filter.college, filtered);
        }
      } catch (error) {
        console.error('Failed to fetch scores:', error);
      }
    };
  
    fetchScores();
  }, [filter]); // Add filter as a dependency to re-fetch when the filter changes
  

  const calculateCollegeStats = (college: string, matches: any[]) => {
    const points = matches.reduce((total: number, match) => {
      const sportPoints = match.sport === 'Soccer' ? 11 : 6; // Adjust as necessary
      if (match.winner === college) {
        return total + sportPoints; // Full points for win
      } else if (match.winner === 'Tie') {
        return total + sportPoints / 2; // Half points for tie
      } else {
        return total; // Zero points for loss or forfeit
      }
    }, 0);

    const games = matches.filter(
      (match) => match.home_college === college || match.away_college === college
    ).length;

    setTotalPoints(points);
    setGamesPlayed(games);

    // Placeholder rank logic
    setRank(1);
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const handleCollegeClick = (collegeName: string) => {
    setFilter((prev) => ({ ...prev, college: collegeName }));
  };

  const handleScheduleButton = (collegeName: string) => {
    sessionStorage.setItem('selectedCollege', collegeName);
    router.push('/schedule');
  };

  const onShowParticipants = () => {
    console.log("TODO")
  }

    // Updated TableHeader Component
    const TableHeader = () => (
      <thead className="bg-gray-200">
        <tr>
          {/* Date/Time Column with Dropdown Filter */}
          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div>
              <select
                name="date"
                onChange={handleFilterChange}
                className="text-xs border-gray-300 rounded-md py-1 px-2"
              >
                <option value="all">Date/Time</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
              </select>
            </div>
          </th>

          {/* Colleges & Score Column with Dropdown Filter */}
          <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div>
              <select
                name="college"
                onChange={handleFilterChange}
                className="text-xs border-gray-300 rounded-md py-1 px-2"
              >
                <option value="">All Colleges & Scores</option>
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
          </th>

          {/* Sport Column with Dropdown Filter */}
          <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div>
              <select
                name="sport"
                onChange={handleFilterChange}
                className="text-xs border-gray-300 rounded-md py-1 px-2"
              >
                <option value="">All Sport</option>
                <option value="Flag Football">Flag Football</option>
                <option value="Spikeball">Spikeball</option>
                <option value="Cornhole">Cornhole</option>
                <option value="Pickleball">Pickleball</option>
                <option value="Table Tennis">Table Tennis</option>
              </select>
            </div>
          </th>

          {/* Players Column */}
          <th className="text-righ px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Players
          </th>
        </tr>
      </thead>
    );

    // Updated TableRow Component
    const TableRow: React.FC<TableRowProps> = ({ match, onShowParticipants }) => (
      <tr className="bg-white">
        <td className="px-6 py-4 text-sm text-gray-500">{new Date(match.timestamp).toLocaleString('en-US', {
            month: 'short', // "Oct"
            day: 'numeric', // "9"
            year: 'numeric', // "2024"
            hour: '2-digit', // "04"
            minute: '2-digit', // "00"
            hour12: true, // "AM/PM"
          })}</td>
        
        {/* Combine Colleges and Scores into one column */}
        <td className="text-center px-6 py-4 text-sm text-gray-500">
          {/* Determine the winner and loser */}
          {match.home_college_score > match.away_college_score ? (
            // Home college wins
            <>
              <strong 
                className="cursor-pointer text-green-500" 
                onClick={() => handleCollegeClick(match.home_college)} // Replace with your function
              >
                {toCollegeName[match.home_college]}
              </strong> 
              ({match.home_college_score}) + 
              {sportsMap[match.sport]}pts vs 
              <strong 
                className="cursor-pointer text-red-500" 
                onClick={() => handleCollegeClick(match.away_college)} // Replace with your function
              >
                {" " + toCollegeName[match.away_college]}
              </strong> 
              ({match.away_college_score}) + 
              0pts
            </>
          ) : match.home_college_score < match.away_college_score ? (
            // Away college wins
            <>
              <strong 
                className="cursor-pointer text-red-500" 
                onClick={() => handleCollegeClick(match.home_college)} // Replace with your function
              >
                {toCollegeName[match.home_college]}
              </strong> 
              ({match.home_college_score}) + 
              0pts vs 
              <strong 
                className="cursor-pointer text-green-500" 
                onClick={() => handleCollegeClick(match.away_college)} // Replace with your function
              >
                {" " + toCollegeName[match.away_college]}
              </strong> 
              ({match.away_college_score}) + 
              {sportsMap[match.sport]}pts
            </>
          ) : (
            // Draw
            <>
              <strong 
                className="cursor-pointer text-orange-500" 
                onClick={() => handleCollegeClick(match.home_college)} // Replace with your function
              >
                {toCollegeName[match.home_college]}
              </strong> 
              ({match.home_college_score}) + 
              {sportsMap[match.sport] / 2}pts vs 
              <strong 
                className="cursor-pointer text-orange-500" 
                onClick={() => handleCollegeClick(match.away_college)} // Replace with your function
              >
                {" " +toCollegeName[match.away_college]}
              </strong> 
              ({match.away_college_score}) + 
              {sportsMap[match.sport] / 2}pts
            </>
          )}
        </td>

        <td className='text-center px-2 py-1'>
          {emojiMap[match.sport]}
        </td>

        {/* Button to show participants */}
        <td className="text-right px-6 text-sm text-gray-500">
          <button
            onClick={() => onShowParticipants(match)}
            className="text-blue-500 hover:text-blue-700"
          >
            Players
          </button>
        </td>
      </tr>
    );

    // Main MatchesTable Component
    const MatchesTable: React.FC<MatchesTableProps> = ({ filteredMatches }) => {
      const onShowParticipants = (match: Match) => {
        // This could trigger a modal, display a dropdown, or anything else
        console.log("TODO")
      };

      return (
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <TableHeader />
          <tbody>
            {filteredMatches.map((match, index) => (
              <TableRow key={index} match={match} onShowParticipants={onShowParticipants} />
            ))}
          </tbody>
        </table>
      );
    };
  

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8 pt-8">Scores and Rankings</h1>

      {/* College Summary (only displayed if a college is filtered) */}
      {filter.college && (
        <div className="mb-8 bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto text-center flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold mb-4">{toCollegeName[filter.college]} Overview</h2>
          <Image
            src={`/college_flags/${toCollegeName[filter.college]}.png`}
            alt={`${toCollegeName[filter.college]}_flag`}
            width="64"
            height="64"
          />
          <div className="text-xl text-gray-700 mb-4">
            <p>
              Total Points: <span className="font-semibold text-blue-600">{totalPoints}</span>
            </p>
            <p>
              Games Played: <span className="font-semibold text-blue-600">{gamesPlayed}</span>
            </p>
            <p>
              Rank: <span className="font-semibold text-blue-600">TODO</span>
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

      <MatchesTable filteredMatches={filteredMatches} />

      {/* Loading Screen */}
      {isLoading && <LoadingScreen />}
    </div>
  );
};

export default ScoresPage;
