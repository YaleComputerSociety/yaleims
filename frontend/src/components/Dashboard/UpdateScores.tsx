"use client";

import React, { useEffect, useState } from "react";
import { Matchv2 as Match } from "@src/types/components";
import MatchCard from "@src/components/AddScores/MatchCard";
import LoadingScreen from "@src/components/LoadingScreen";

const UpdateScores: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unscoreId, setUnscoreId] = useState<string>(""); // For unscore input
  const [unscoreMessage, setUnscoreMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false); // For confirmation modal

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const userToken = sessionStorage.getItem("userToken");
        const response = await fetch(
          "https://us-central1-yims-125a2.cloudfunctions.net/getUnscoredMatches",
          {
            headers: { Authorization: `Bearer ${userToken}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setMatches(data.matches);
        }
      } catch (error) {
        console.error("Failed to fetch matches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const handleUnscoreMatch = async () => {
    setLoading(true);
    setUnscoreMessage(null);

    try {
      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/undoScoreMatch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({ matchId: unscoreId }),
        }
      );

      if (response.ok) {
        setUnscoreMessage("Successfully unscored the match.");
        setUnscoreId(""); // Clear input after success
      } else {
        const errorData = await response.json();
        setUnscoreMessage(`Failed to unscore match: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Failed to unscore match:", error);
      setUnscoreMessage("An error occurred. Please try again.");
    } finally {
      setLoading(false);
      setShowConfirmation(false); // Hide modal after processing
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true); // Show confirmation dialog
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 w-full flex flex-col gap-6">
      <h2 className="text-2xl font-semibold text-blue-600 mb-2">
        Matches To Be Scored
      </h2>
      <div className="flex flex-col gap-3">
        {/* Matches Section */}
        {Array.isArray(matches) && matches.length === 0 ? (
          <p className="text-gray-500 text-center">
            No past matches to be scored
          </p>
        ) : Array.isArray(matches) ? (
          matches.map((match) => (
            <MatchCard key={match.id} match={match} setLoading={setLoading} />
          ))
        ) : (
          <p className="text-red-500 text-center">
            Something went wrong. Please try again later.
          </p>
        )}
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
        <h3 className="text-lg font-bold text-blue-600 mb-2">
          Undo Scored Match
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label
            htmlFor="matchId"
            className="text-gray-700 dark:text-gray-300 mb-1"
          >
            Enter Match ID to Unscore:
          </label>
          <input
            type="text"
            id="matchId"
            value={unscoreId}
            onChange={(e) => setUnscoreId(e.target.value)}
            placeholder="Match ID"
            className="p-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300 bg-gray-50 dark:bg-gray-800"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mt-2 self-end"
          >
            Unscore Match
          </button>
        </form>
        {unscoreMessage && (
          <p
            className={`mt-2 text-sm ${
              unscoreMessage.includes("Successfully")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {unscoreMessage}
          </p>
        )}
      </div>
      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-lg font-semibold mb-4">
              Are you sure you want to unscore this match?
            </h3>
            <p className="mb-6 text-gray-600">Match ID: {unscoreId}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleUnscoreMatch}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateScores;
