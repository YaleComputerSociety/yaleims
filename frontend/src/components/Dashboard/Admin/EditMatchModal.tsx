"use client";

import { useSeason } from "@src/context/SeasonContext";
import { currentYear, getYearFromTimestamp } from "@src/utils/helpers";
import React from "react";
import LoadingScreen from "@src/components/LoadingScreen";
import { toast } from "react-toastify";
import { FaSpinner } from "react-icons/fa";
import { Match } from "@src/types/components";

interface EditMatchModalProps {
  unscoreId: string;
  setShowConfirmation: (value: React.SetStateAction<boolean>) => void;
  match?: Match;
  setUnscored?: (value: React.SetStateAction<boolean>) => void;

  // these will only be used if it's coming from the add scores page
  setUnscoreMessage?: (value: React.SetStateAction<string | null>) => void;
  setUnscoreId?: (value: React.SetStateAction<string>) => void;
  setRefreshKey?: (value: React.SetStateAction<number>) => void;
}

const EditMatchModal: React.FC<EditMatchModalProps> = ({
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

  // Handler for editing a match: sends data to /api/editMatch
  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!match) {
      toast.error("No match data available for editing.");
      return;
    }
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    // Collect all fields
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (key === "forfeit") {
        data[key] = true;
      } else {
        data[key] = value;
      }
    });
    if (!formData.has("forfeit")) {
      data["forfeit"] = false;
    }

    data["id"] = 1;

    try {
      const response = await fetch("/api/functions/editMatch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update match");
      }

      toast.success("Match updated successfully!");

      if (setRefreshKey) setRefreshKey((k) => k + 1);
      setShowConfirmation(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update match");
    } finally {
      setLoading(false);
    }
  };

  if (seasonLoading) {
    return <LoadingScreen />;
  }

  if (!match) {
    return null;
  }

  const matchIsScored = match.winner !== null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg text-center border border-gray-200 dark:border-gray-700 mx-2 sm:mx-0 w-full max-w-xs sm:max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Edit Match
        </h3>
        {match && (
          <form className="flex flex-col gap-3 mb-6" onSubmit={handleEdit}>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Home College
                </label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                  defaultValue={match.home_college}
                  name="home_college"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Away College
                </label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                  defaultValue={match.away_college}
                  name="away_college"
                />
              </div>
            </div>
            {/* Location fields */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Location
                </label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                  defaultValue={match.location}
                  name="location"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Location Extra
                </label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                  defaultValue={match.location_extra}
                  name="location_extra"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Date/Time
                </label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                  type="datetime-local"
                  defaultValue={
                    match.timestamp
                      ? new Date(match.timestamp).toISOString().slice(0, 16)
                      : ""
                  }
                  name="timestamp"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Sport
                </label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                  defaultValue={match.sport}
                  name="sport"
                />
              </div>
            </div>

            {/* Conditionally render scoring section if match is scored */}
            {match && matchIsScored && (
              <div className="border rounded p-3 bg-gray-50 dark:bg-gray-900 mt-2">
                <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">
                  Scoring
                </h4>
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Home Score
                    </label>
                    <input
                      className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                      type="number"
                      defaultValue={match.home_college_score}
                      name="home_college_score"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Away Score
                    </label>
                    <input
                      className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                      type="number"
                      defaultValue={match.away_college_score}
                      name="away_college_score"
                    />
                  </div>
                </div>
                {/* Forfeit toggle */}
                <div className="flex items-center gap-2 mt-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Forfeit
                  </label>
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:bg-gray-800 dark:border-gray-600"
                    defaultChecked={!!match.forfeit}
                    name="forfeit"
                  />
                  <span className="text-xs text-gray-500 ml-1">
                    Check if match was forfeited
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 border border-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <FaSpinner className="animate-spin inline" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </form>
        )}

        {match && matchIsScored && (
          <>
            <hr className="my-4 border-t-2 border-gray-300" />{" "}
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Unscore Match
            </h3>
            <div className="flex justify-center gap-4">
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
          </>
        )}
      </div>
    </div>
  );
};

export default EditMatchModal;
