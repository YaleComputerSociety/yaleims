"use client";

import { useSeason } from "@src/context/SeasonContext";
import { currentYear, getYearFromTimestamp } from "@src/utils/helpers";
import React from "react";
import LoadingScreen from "../LoadingScreen";
import { toast } from "react-toastify";
import { FaSpinner } from "react-icons/fa";
import { Match } from "@src/types/components";

interface UndoScoreMatchModalProps {
  unscoreId: string;
  setShowConfirmation: (value: React.SetStateAction<boolean>) => void;
  match?: Match;
  setUnscored?: (value: React.SetStateAction<boolean>) => void;

  // these will only be used if it's coming from the add scores page
  setUnscoreMessage?: (value: React.SetStateAction<string | null>) => void;
  setUnscoreId?: (value: React.SetStateAction<string>) => void;
  setRefreshKey?: (value: React.SetStateAction<number>) => void;
}

const UndoScoreMatchModal: React.FC<UndoScoreMatchModalProps> = ({
  unscoreId,
  setShowConfirmation,
  setUnscoreMessage,
  setUnscoreId,
  setRefreshKey,
  match,
  setUnscored,
}) => {
  const [loading, setLoading] = React.useState<boolean>(false);
  const { currentSeason, seasonLoading } = useSeason();
  const year =
    (match && getYearFromTimestamp(match?.timestamp)) ||
    currentSeason?.year ||
    currentYear;

  const handleUnscoreMatch = async () => {
    setLoading(true);

    try {
      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch("/api/functions/undoScoreMatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          matchId: String(unscoreId).trim(),
          year: String(year),
        }),
      });

      if (response.ok) {
        if (setUnscoreMessage)
          setUnscoreMessage("Successfully unscored the match.");
        else toast.success("Successfully unscored the match.");
        if (setUnscoreId) setUnscoreId(""); // Clear input after success
        if (setRefreshKey) setRefreshKey((k) => k + 1); // Trigger refetch
        else if (setUnscored) setUnscored(true); // set unscored to hide table row
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error) {
      const errorMessage =
        "Undo score failed: " + (error as Error)?.message ||
        "An unknown error occurred. Please try again.";
      if (setUnscoreMessage) setUnscoreMessage(errorMessage);
      else toast.error(errorMessage);
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
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg text-center border border-gray-200 dark:border-gray-700">
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
