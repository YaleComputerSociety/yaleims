"use client"

import React, { useState } from 'react';
import RoundRobin from '../../components/RoundRobin';
import Playoffs from '../../components/Playoffs';
import ManageMatches from '../../components/ManageMatches';
import { loggedInUser } from "../../data/user"; // Import the logged-in user


const BracketPage: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<'roundRobin' | 'playoffs' | 'manage'>('roundRobin');
  const [roleFilter, setRoleFilter] = useState("");

   // Check if the logged-in user is an admin
   const isAdmin = loggedInUser.role === "admin";

  if (!isAdmin) {
    return <div className="min-h-screen bg-gray-100 p-8"><p className="text-red-600 text-center">You are not authorized to access this page.</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Bracket Management</h1>

      {/* Option Selection */}
      <div className="flex justify-center mb-8">
        <button onClick={() => setSelectedOption('roundRobin')} className={`px-4 py-2 ${selectedOption === 'roundRobin' ? 'bg-blue-600 text-white' : 'bg-gray-300'} rounded-lg mx-2`}>
          Round Robin
        </button>
        <button onClick={() => setSelectedOption('playoffs')} className={`px-4 py-2 ${selectedOption === 'playoffs' ? 'bg-blue-600 text-white' : 'bg-gray-300'} rounded-lg mx-2`}>
          Playoffs
        </button>
        <button onClick={() => setSelectedOption('manage')} className={`px-4 py-2 ${selectedOption === 'manage' ? 'bg-blue-600 text-white' : 'bg-gray-300'} rounded-lg mx-2`}>
          Manage Matches
        </button>
      </div>

      {/* Render Components */}
      {selectedOption === 'roundRobin' && <RoundRobin />}
      {selectedOption === 'playoffs' && <Playoffs />}
      {selectedOption === 'manage' && <ManageMatches />}
    </div>
  );
};

export default BracketPage;
