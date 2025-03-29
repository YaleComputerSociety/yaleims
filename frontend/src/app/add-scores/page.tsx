"use client";

import React, { useEffect, useState } from "react";
import { Matchv2 as Match } from "@src/types/components";
import MatchCard from "../../components/AddScores/MatchCard";
import LoadingScreen from "../../components/LoadingScreen";
import withProtectedRoute from "../../components/withProtectedRoute";

const AddScoresPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unscoreId, setUnscoreId] = useState<string>(""); // For unscore input
  const [unscoreMessage, setUnscoreMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false); // For confirmation modal

  useEffect(() => {
    document.title = "Score Matches";
  }, []);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const userToken = sessionStorage.getItem("userToken")
        const response = await fetch(
          "https://us-central1-yims-125a2.cloudfunctions.net/getUnscoredMatches",
          {
            headers: {Authorization: `Bearer ${userToken}`}
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
      const userToken = sessionStorage.getItem("userToken")
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/undoScoreMatch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`
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
    <div className="min-h-screen p-8 flex-col items-center mx-auto md:mx-20">
      <h1 className="md:text-4xl text-xl font-bold text-center mb-8 pt-8 text-blue-600">
        Matches To Be Scored
      </h1>

      <div className="flex flex-col gap-4 items-center">
        {/* Matches Section */}
        {Array.isArray(matches) && matches.length === 0 ? (
          <p>No past matches to be scored</p>
        ) : Array.isArray(matches) ? (
          matches.map((match) => (
            <MatchCard key={match.id} match={match} setLoading={setLoading} />
          ))
        ) : (
          <p>Something went wrong. Please try again later.</p>
        )}

        {/* Unscore Match Form */}
        <div className="mt-8 p-4 w-full md:w-1/2">
          <h2 className="text-xl font-bold mb-4 text-blue-600">
            Undo Scored Match
          </h2>
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="matchId"
              className="block text-gray-700 dark:text-gray-300 mb-2"
            >
              Enter Match ID to Unscore:
            </label>
            <input
              type="text"
              id="matchId"
              value={unscoreId}
              onChange={(e) => setUnscoreId(e.target.value)}
              placeholder="Match ID"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300"
              required
            />
            <button
              type="submit"
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Unscore Match
            </button>
          </form>
          {unscoreMessage && (
            <p
              className={`mt-4 text-sm ${
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
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
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
    </div>
  );
};

AddScoresPage.displayName = "AddScoresPage";

export default withProtectedRoute(AddScoresPage);
