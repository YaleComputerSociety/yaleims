import React, { useState, useEffect } from 'react';
import { matches, Match } from '../data/matches';
import { colleges } from '../data/colleges';
import { sports } from '../data/sports';

const ManageMatchesComponent: React.FC = () => {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>(Object.values(matches));
  const [collegeFilter, setCollegeFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');

  useEffect(() => {
    const filterResults = Object.values(matches).filter((match) => {
      return (
        (collegeFilter === '' || match.college1 === collegeFilter || match.college2 === collegeFilter) &&
        (sportFilter === '' || match.sport === sportFilter)
      );
    });
    setFilteredMatches(filterResults);
  }, [collegeFilter, sportFilter]);

  const handleSelectMatch = (matchId: string) => {
    if (selectedMatches.includes(matchId)) {
      setSelectedMatches(selectedMatches.filter((id) => id !== matchId));
    } else {
      setSelectedMatches([...selectedMatches, matchId]);
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedMatches(filteredMatches.map((match) => match.matchId));
    } else {
      setSelectedMatches([]);
    }
  };

  const handleBulkDelete = () => {
    const remainingMatches = Object.values(matches).filter(
      (match) => !selectedMatches.includes(match.matchId)
    );
    // Logic to update your state or data after bulk delete
  };

  const handleInputChange = (matchId: string, field: keyof Match, value: string) => {
    setFilteredMatches((prevMatches) =>
      prevMatches.map((match) =>
        match.matchId === matchId ? { ...match, [field]: value } : match
      )
    );
  };

  return (
    <div>
      <h2 className="text-2xl mb-4 text-center">Manage Matches</h2>

      {/* Filters */}
      <div className="flex justify-center space-x-4 mb-8">
        <div>
          <label className="block text-lg font-bold mb-2">Filter by College</label>
          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg w-48"
          >
            <option value="">All Colleges</option>
            {Object.values(colleges).map((college) => (
              <option key={college.id} value={college.name}>
                {college.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-lg font-bold mb-2">Filter by Sport</label>
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg w-48"
          >
            <option value="">All Sports</option>
            {Object.values(sports).map((sport) => (
              <option key={sport.id} value={sport.name}>
                {sport.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">
          Delete Selected Matches
        </button>
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3">
              <input
                type="checkbox"
                onChange={(e) => handleSelectAll(e.target.checked)}
                checked={selectedMatches.length === filteredMatches.length && filteredMatches.length > 0}
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              College 1
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              College 2
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredMatches.map((match) => (
            <tr key={match.matchId}>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <input
                  type="checkbox"
                  checked={selectedMatches.includes(match.matchId)}
                  onChange={() => handleSelectMatch(match.matchId)}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <input
                  type="text"
                  value={match.college1}
                  onChange={(e) => handleInputChange(match.matchId, 'college1', e.target.value)}
                  className="border p-1 w-full"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <input
                  type="text"
                  value={match.college2}
                  onChange={(e) => handleInputChange(match.matchId, 'college2', e.target.value)}
                  className="border p-1 w-full"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <input
                  type="date"
                  value={match.date}
                  onChange={(e) => handleInputChange(match.matchId, 'date', e.target.value)}
                  className="border p-1 w-full"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <input
                  type="time"
                  value={match.time}
                  onChange={(e) => handleInputChange(match.matchId, 'time', e.target.value)}
                  className="border p-1 w-full"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <input
                  type="text"
                  value={match.location}
                  onChange={(e) => handleInputChange(match.matchId, 'location', e.target.value)}
                  className="border p-1 w-full"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageMatchesComponent;
