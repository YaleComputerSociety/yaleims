'use client';

import { useEffect, useState } from 'react';
import { matches } from '../../data/previousMatches';
import { colleges } from '../../data/colleges';
import { sports } from '../../data/sports';

interface FilterOptions {
  college: string;
  sport: string;
  date: string;
}

const ScoresPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterOptions>({ college: '', sport: '', date: '' });
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [rank, setRank] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  useEffect(() => {
    // Get a selected college from session storage
    const selectedCollege = sessionStorage.getItem('selectedCollege');
    if (selectedCollege) {
      setFilter((prev) => ({ ...prev, college: selectedCollege }));
    }
  }, []);

  useEffect(() => {
    const filtered = Object.values(matches).filter((match) => {
      const collegeMatch = filter.college ? [match.college1, match.college2].includes(filter.college) : true;
      const sportMatch = filter.sport ? match.sport === filter.sport : true;
      const dateMatch = filter.date ? match.date === filter.date : true;
      return collegeMatch && sportMatch && dateMatch;
    });

    setFilteredMatches(filtered);
    if (filter.college) {
      calculateCollegeStats(filter.college, filtered);
    }
  }, [filter]);

  const calculateCollegeStats = (college: string, matches) => {
    const points = matches.reduce((total, match) => {
      const sportPoints = match.sport === 'Soccer' ? 11 : 6; // Adjust this as necessary
      if (match.winner === college) {
        return total + sportPoints; // Full points for win
      } else if (match.winner === 'Tie') {
        return total + sportPoints / 2; // Half points for tie
      } else {
        return total; // Zero points for loss or forfeit
      }
    }, 0);

    const games = matches.filter((match) => match.college1 === college || match.college2 === college).length;

    setTotalPoints(points);
    setGamesPlayed(games);

    // Placeholder rank logic, adjust as needed
    setRank(1); // Assume rank 1 for now
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Scores and Rankings</h1>

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
        <div className="mb-8 bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{filter.college} Overview</h2>
          <div className="text-xl text-gray-700 mb-4">
            <p>Total Points: <span className="font-semibold text-blue-600">{totalPoints}</span></p>
            <p>Games Played: <span className="font-semibold text-blue-600">{gamesPlayed}</span></p>
            <p>Rank: <span className="font-semibold text-blue-600">{rank}</span></p>
          </div>
        </div>
      )}

      {/* Matches Table */}
      <table className="min-w-full bg-white shadow-md rounded-lg">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College 1</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College 2</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sport</th>
          </tr>
        </thead>
        <tbody>
          {filteredMatches.map((match, index) => {
            const college1Style = match.winner === match.college1 ? 'bg-green-200' : match.winner === 'Tie' ? 'bg-yellow-200' : 'bg-red-200';
            const college2Style = match.winner === match.college2 ? 'bg-green-200' : match.winner === 'Tie' ? 'bg-yellow-200' : 'bg-red-200';

            return (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">{match.date} {match.time}</td>
                <td className={`px-6 py-4 whitespace-nowrap ${college1Style}`}>
                  {match.college1} {match.winner === match.college1 ? `(+${match.sport === 'Soccer' ? 11 : 6} pts)` : match.winner === 'Tie' ? '(+Half pts)' : ''}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap ${college2Style}`}>
                  {match.college2} {match.winner === match.college2 ? `(+${match.sport === 'Soccer' ? 11 : 6} pts)` : match.winner === 'Tie' ? '(+Half pts)' : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{match.sport}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ScoresPage;
