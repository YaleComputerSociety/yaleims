"use client";

import React, { useState, useEffect } from "react";
import { matches } from "../../data/matches"; // Replace with your actual data source
import { loggedInUser } from "../../data/user"; // Replace with your actual user data
import { specialUsers } from '../../data/specialUsers';

const RefScoringPage: React.FC = () => {
  const [unscoredMatches, setUnscoredMatches] = useState([]);
  const [scoredMatches, setScoredMatches] = useState([]);

  useEffect(() => {
    // Separate matches into scored and unscored
    const unscored = Object.values(matches).filter(
      (match) => match.winner === null
    );
    const scored = Object.values(matches).filter(
      (match) => match.winner !== null
    );
    setUnscoredMatches(unscored);
    setScoredMatches(scored);
  }, []);

  // Check if user has the correct role
  const canScore = ["referee", "secretary", "admin"].includes(loggedInUser.role);

  // Handle scoring a match
  const handleScoreMatch = (matchId: string, winner: string) => {
    const scoredMatch = unscoredMatches.find((match) => match.matchId === matchId);

    if (scoredMatch) {
      scoredMatch.winner = winner;
      scoredMatch.ref_id = loggedInUser.netid; // Set ref_id to the logged-in user's netid

      // Move the scored match to the scoredMatches array
      setScoredMatches((prevScored) => [...prevScored, scoredMatch]);

      // Remove the scored match from the unscoredMatches array
      setUnscoredMatches((prevUnscored) =>
        prevUnscored.filter((match) => match.matchId !== matchId)
      );
    }
  };

  // Handle modifying a scored match
  const handleModifyMatch = (matchId: string, newWinner: string) => {
    const modifiedMatch = scoredMatches.find((match) => match.matchId === matchId);

    if (modifiedMatch) {
      modifiedMatch.winner = newWinner;
      setScoredMatches([...scoredMatches]); // Re-trigger the state update
    }
  };

  // Get the referee's name by matching their `netid` to the `ref_id`
  const getRefereeName = (ref_id: string | null) => {
    if (!ref_id) return "Unknown Referee";
    const referee = specialUsers.find((ref) => ref.netid === ref_id);
    return referee ? referee.firstname + " " + referee.lastname : "Unknown Referee";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Ref Scoring</h1>

      {!canScore && (
        <p className="text-red-600 text-center">
          You are not authorized to score matches.
        </p>
      )}

      {canScore && (
        <div>
          <h2 className="text-2xl mb-4">Unscored Matches</h2>
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <thead className="bg-blue-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  College 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  College 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Sport
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Winner
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {unscoredMatches.map((match, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.date} at {match.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.college1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.college2}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.sport}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      onChange={(e) => handleScoreMatch(match.matchId, e.target.value)}
                      defaultValue=""
                      className="p-2 border border-gray-300 rounded-lg"
                    >
                      <option value="" disabled>Select Winner</option>
                      <option value={match.college1}>{match.college1}</option>
                      <option value={match.college2}>{match.college2}</option>
                      <option value="Tie">Tie</option>
                      <option value="Forfeit">Both Forfeit</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="text-2xl mb-4">Scored Matches</h2>
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-green-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  College 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  College 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Sport
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Winner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Referee
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scoredMatches.map((match, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.date} at {match.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.college1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.college2}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.sport}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                  <select
                      onChange={(e) => handleModifyMatch(match.matchId, e.target.value)}
                      defaultValue={match.winner || ""}
                      className="p-2 border border-gray-300 rounded-lg"
                    >
                      <option value="" disabled>Select New Winner</option>
                      <option value={match.college1}>{match.college1}</option>
                      <option value={match.college2}>{match.college2}</option>
                      <option value="Tie">Tie</option>
                      <option value="Forfeit">Both Forfeit</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getRefereeName(match.ref_id)}
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

export default RefScoringPage;
