import React, { useState, useEffect } from 'react';
import { soccerRoundRobinResults, MatchResult } from '../data/roundRobinResults'; // Import your round robin results data
import { sports } from '../data/sports'; // Import your sports data

const PlayoffControl: React.FC = () => {
    const [selectedSport, setSelectedSport] = useState<number | null>(null);

  const handleSelectSport = (id: number) => {
    setSelectedSport(id);
  };

    const blueDivisionRankings = [
    'Benjamin Franklin',
    'Berkeley',
    'Branford',
    'Saybrook',
    'Davenport',
    'Timothy Dwight',
    'Trumbull',
    ];

    const greenDivisionRankings = [
    'Jonathan Edwards',
    'Silliman',
    'Ezra Stiles',
    'Morse',
    'Grace Hopper',
    'Pierson',
    'Calhoun',
    ];


  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-4xl font-bold text-center mb-8">Playoff Setup</h1>

      {/* Sport Selection */}
      <div className="grid lg:grid-cols-6 md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-4 mb-8">
        {Object.values(sports).map((sport) => (
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

      {/* Display Rankings */}
      {selectedSport && (
        <>
          <div className="flex justify-center gap-8">
            {/* Blue Division Rankings */}
            <div className="w-1/2 bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-blue-600 text-center mb-4">Blue Division</h2>

              <ul className="list-decimal list-inside  items-center">
                {blueDivisionRankings.map((college, index) => (
                  <li key={index} className="text-lg">
                     {college}
                  </li>
                ))}
              </ul>

            </div>

            {/* Green Division Rankings */}
            <div className="w-1/2 bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-green-600 text-center mb-4">Green Division</h2>
              <ul className="list-decimal list-inside">
                {greenDivisionRankings.map((college, index) => (
                  <li key={index} className="text-lg">
                    {college}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PlayoffControl;
