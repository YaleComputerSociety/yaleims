"use client";

import React, { useEffect, useState } from "react";
import { Matchv2 as Match } from "@src/types/components";
import MatchCard from "@src/components/AddScores/MatchCard";
import LoadingScreen from "@src/components/LoadingScreen";
import { useSeason } from "@src/context/SeasonContext";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import { currentYear } from "@src/utils/helpers";
import UndoScoreMatchModal from "@src/components/AddScores/UndoScoreMatchModal";
import PageHeading from "@src/components/PageHeading";

const AddScoresPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unscoreId, setUnscoreId] = useState<string>(""); // For unscore input
  const [unscoreMessage, setUnscoreMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false); // For confirmation modal
  const [refreshKey, setRefreshKey] = useState(0); // For refetching matches
  const { currentSeason, seasonLoading } = useSeason();
  const year = currentSeason?.year || currentYear;

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/functions/getUnscoredMatches?seasonId=${year}`
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
  }, [refreshKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true); // Show confirmation dialog
  };

  if (loading || seasonLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen pt-10 px-4 sm:px-8 md:px-10">
      <PageHeading heading="Update Scores" />
      <div className="flex-col items-center mx-auto md:mx-20">
        <h1 className="md:text-2xl text-xl font-bold text-center mb-8 pt-8 text-blue-600">
          Matches To Be Scored
        </h1>

        <div className="flex flex-col gap-4 items-center">
          {/* Matches Section */}
          {Array.isArray(matches) && matches.length === 0 ? (
            <p>No past matches to be scored</p>
          ) : Array.isArray(matches) ? (
            matches.map((match) => <MatchCard key={match.id} match={match} />)
          ) : (
            <p>Something went wrong. Please try again later.</p>
          )}

          {/* Unscore Match Form */}
          <div className="mt-8 p-2 w-full md:w-1/2">
            <h2 className="text-xl font-bold mb-4 text-blue-600">
              Undo Scored Match
            </h2>
            <div className="mb-4 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm rounded px-3 py-2 border border-blue-200 dark:border-blue-800">
              You can now unscore matches directly from the scores page by
              clicking on the match ID!
            </div>
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
            <UndoScoreMatchModal
              unscoreId={unscoreId}
              setShowConfirmation={setShowConfirmation}
              setUnscoreMessage={setUnscoreMessage}
              setUnscoreId={setUnscoreId}
              setRefreshKey={setRefreshKey}
            />
          )}
        </div>
      </div>
    </div>
  );
};

AddScoresPage.displayName = "AddScoresPage";

export default withRoleProtectedRoute(AddScoresPage, ["admin", "dev"]);
