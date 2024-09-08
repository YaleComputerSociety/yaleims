import React, { useState } from 'react';
import { colleges } from '../data/colleges';
import { sports } from '../data/sports';
import { Match, matches } from '../data/matches';
import { v4 as uuidv4 } from 'uuid';

const RoundRobin: React.FC = () => {
  const sportsArray = Object.values(sports);
  const collegesArray = Object.values(colleges);
  const [selectedSport, setSelectedSport] = useState<number | null>(null);
  const [blueDivision, setBlueDivision] = useState<string[]>([]);
  const [greenDivision, setGreenDivision] = useState<string[]>([]);
  const [roundRobinMatches, setRoundRobinMatches] = useState<Match[]>([]);
  const [clickedButton, setClickedButton] = useState<number | null>(null);

  const handleSelectSport = (id: number) => {
    setSelectedSport(id);
  };

  const handleGenerateDivisions = () => {
    const shuffledColleges = [...collegesArray].sort(() => Math.random() - 0.5);
    setBlueDivision(shuffledColleges.slice(0, 7).map((c) => c.name));
    setGreenDivision(shuffledColleges.slice(7).map((c) => c.name));
  };

  const handleGenerateRoundRobin = () => {
    const generateMatches = (division: string[]): Match[] => {
      const matches: Match[] = [];
      for (let i = 0; i < division.length; i++) {
        for (let j = i + 1; j < division.length; j++) {
          matches.push({
            matchId: uuidv4(),
            college1: division[i],
            college2: division[j],
            sport: sportsArray.find((s) => s.id === selectedSport)?.name || 'Unknown',
            date: '',
            time: '',
            location: '',
            ref_id: null,
            winner: null,
            college1_participants: [],
            college2_participants: [],
          });
        }
      }
      return matches;
    };

    const blueMatches = generateMatches(blueDivision);
    const greenMatches = generateMatches(greenDivision);
    setRoundRobinMatches([...blueMatches, ...greenMatches]);
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    const updatedMatches = roundRobinMatches.map((match, i) =>
      i === index ? { ...match, [field]: value } : match
    );
    setRoundRobinMatches(updatedMatches);
  };

  const validateSingleMatch = (match: Match, index: number) => {
    let hasConflict = false;

    if (!match.date || !match.time || !match.location) {
        hasConflict = true
    }

    // Check for conflicts with old matches
    Object.values(matches).forEach((oldMatch) => {
      if (oldMatch.date === match.date && oldMatch.time === match.time) {
        if (
          oldMatch.college1 === match.college1 ||
          oldMatch.college2 === match.college1 ||
          oldMatch.college1 === match.college2 ||
          oldMatch.college2 === match.college2
        ) {
          hasConflict = true;
        }
      }

      if (
        oldMatch.location === match.location &&
        oldMatch.date === match.date &&
        oldMatch.time === match.time
      ) {
        hasConflict = true;
      }
    });

    // Check for conflicts within roundRobinMatches
    roundRobinMatches.forEach((otherMatch, otherIndex) => {
      if (otherIndex !== index) {
        if (otherMatch.date === match.date && otherMatch.time === match.time) {
          if (
            otherMatch.college1 === match.college1 ||
            otherMatch.college2 === match.college1 ||
            otherMatch.college1 === match.college2 ||
            otherMatch.college2 === match.college2
          ) {
            hasConflict = true;
          }
        }

        if (
          otherMatch.location === match.location &&
          otherMatch.date === match.date &&
          otherMatch.time === match.time
        ) {
          hasConflict = true;
        }
      }
    });

    // Update the state with the conflict status
    const updatedMatches = roundRobinMatches.map((m, i) =>
      i === index ? { ...m, hasConflict } : m
    );
    console.log(roundRobinMatches);
    setRoundRobinMatches(updatedMatches);
  };

  return (
    <div>
      <h2 className="text-2xl mb-4 text-center">Round Robin Generation</h2>
      <div className="grid lg:grid-cols-6 md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-4 mb-8">
        {sportsArray.map((sport) => (
          <button
            key={sport.id}
            onClick={() => handleSelectSport(sport.id)}
            className={`p-4 border rounded-lg text-center ${selectedSport === sport.id ? 'bg-blue-600 text-white' : 'bg-white'}`}
          >
            <span className="text-xl">{sport.emoji}</span>
            <h3 className="text-lg">{sport.name}</h3>
          </button>
        ))}
      </div>
      <div className="flex justify-center mb-8">
        <button onClick={handleGenerateDivisions} className="px-4 py-2 bg-green-600 text-white rounded-lg">Generate Divisions</button>
      </div>
      {blueDivision.length > 0 && greenDivision.length > 0 && (
        <>
          <h3 className="text-2xl mb-4 text-center">Divisions</h3>
          <div className="flex justify-center gap-5">
            <div>
              <h4 className="text-xl font-bold text-blue-600">Blue Division</h4>
              <ul className="list-disc list-inside">{blueDivision.map((team) => <li key={team}>{team}</li>)}</ul>
            </div>
            <div>
              <h4 className="text-xl font-bold text-green-600">Green Division</h4>
              <ul className="list-disc list-inside">{greenDivision.map((team) => <li key={team}>{team}</li>)}</ul>
            </div>
          </div>
          <div className="flex justify-center mt-8">
            <button onClick={handleGenerateRoundRobin} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Generate Round Robin</button>
          </div>
        </>
      )}
      <br></br>
      <br></br>
      {roundRobinMatches.length > 0 && (
        <div className="flex flex-col items-center">
          <h3 className="text-2xl mb-4">Round Robin Matches</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roundRobinMatches.map((match, index) => (
                <tr key={index} className={`${match.hasConflict ? 'bg-red-200' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {match.college1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {match.college2}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="date"
                      value={match.date}
                      onChange={(e) => handleInputChange(index, 'date', e.target.value)}
                      className="border p-1"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="time"
                      value={match.time}
                      onChange={(e) => handleInputChange(index, 'time', e.target.value)}
                      className="border p-1"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="text"
                      value={match.location}
                      onChange={(e) => handleInputChange(index, 'location', e.target.value)}
                      className="border p-1"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        validateSingleMatch(match, index);
                        setClickedButton(index);

                        setTimeout(() => setClickedButton(null), 300);
                      }}
                      className={`px-4 py-2 text-white rounded-lg transition duration-200 ${
                        clickedButton === index ? 'bg-blue-400 transform scale-95' : 'bg-blue-600'
                      }`}
                    >
                      Submit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RoundRobin;
