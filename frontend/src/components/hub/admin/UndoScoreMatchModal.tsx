"use client";

import React from "react";
import { FaSpinner } from "react-icons/fa";
import { useSeason } from "@/context/SeasonContext";
import LoadingScreen from "@/components/layout/LoadingScreen";
import { undoScore } from "@/lib/api/matches";

interface UndoScoreMatchModalProps {
  /** The game's id, this season. */
  unscoreId: string;
  setShowConfirmation: (value: React.SetStateAction<boolean>) => void;
  setUnscoreMessage: (value: React.SetStateAction<string | null>) => void;
  setUnscoreId: (value: React.SetStateAction<string>) => void;
  setRefreshKey: (value: React.SetStateAction<number>) => void;
}

/** The add-scores page's confirmation before undoing a game's score by its id. */
const UndoScoreMatchModal: React.FC<UndoScoreMatchModalProps> = ({
  unscoreId,
  setShowConfirmation,
  setUnscoreMessage,
  setUnscoreId,
  setRefreshKey,
}) => {
  const [loading, setLoading] = React.useState<boolean>(false);
  const { currentSeason, seasonLoading } = useSeason();

  const handleUnscoreMatch = async () => {
    if (!currentSeason) return;
    setLoading(true);
    try {
      await undoScore(currentSeason.id, unscoreId.trim());
      setUnscoreMessage("Successfully unscored the match.");
      setUnscoreId("");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      setUnscoreMessage("Undo score failed: " + (error as Error).message);
    } finally {
      setLoading(false);
      setShowConfirmation(false); // Hide modal after processing
    }
  };

  if (seasonLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg text-center border border-gray-200 dark:border-gray-700 mx-2 sm:mx-0 w-full max-w-xs sm:max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Are you sure you want to unscore this match?
        </h3>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          Match ID:{" "}
          <span className="font-mono text-gray-500 dark:text-gray-400">
            {unscoreId}
          </span>
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setShowConfirmation(false)}
            className="bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleUnscoreMatch}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 border border-red-700 dark:border-red-800"
            disabled={loading}
          >
            {loading ? (
              <FaSpinner className="animate-spin text-lg mx-auto" />
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UndoScoreMatchModal;
