"use client";

import { useSeason } from "@src/context/SeasonContext";
import {
  currentYear,
  getYearFromTimestamp,
  isValidCollegeAbbrev,
  isValidSport,
  userIsAdminOrDev,
} from "@src/utils/helpers";
import React, { useState } from "react";
import LoadingScreen from "@src/components/LoadingScreen";
import { toast } from "react-toastify";
import { FaEdit, FaSpinner } from "react-icons/fa";
import { Match } from "@src/types/components";
import { useUser } from "@src/context/UserContext";

interface EditMatchModalProps {
  setModalOpen: (value: React.SetStateAction<boolean>) => void;
  match?: Match;
  setUnscored?: (value: React.SetStateAction<boolean>) => void;
}

interface EditMatchButtonProps {
  match: Match;
  setUnscored?: (value: React.SetStateAction<boolean>) => void;
}

export const EditMatchButton: React.FC<EditMatchButtonProps> = ({
  match,
  setUnscored,
}) => {
  const { user } = useUser();
  const isAdmin = userIsAdminOrDev(user);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);

  const handleEditClick = () => {
    setEditModalOpen(true);
  };

  if (!isAdmin) return null;

  return (
    <>
      <span
        onClick={handleEditClick}
        className="ml-2 p-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 font-mono text-[10px] border border-gray-200 dark:border-gray-700 cursor-pointer"
      >
        <FaEdit className="inline text-base" />
      </span>

      {editModalOpen && (
        <EditMatchModal
          match={match}
          setModalOpen={setEditModalOpen}
          setUnscored={setUnscored}
        />
      )}
    </>
  );
};

export const EditMatchModal: React.FC<EditMatchModalProps> = ({
  setModalOpen,
  match,
  setUnscored,
}) => {
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [undoLoading, setUndoLoading] = useState<boolean>(false);
  const { currentSeason, seasonLoading } = useSeason();
  const year =
    (match && getYearFromTimestamp(match?.timestamp)) ||
    currentSeason?.year ||
    currentYear;

  const matchId = match?.id || null;

  const validateEditInput = (
    homeCollege: string,
    awayCollege: string,
    sport: string
  ) => {
    if (!isValidCollegeAbbrev(homeCollege)) {
      toast.error("Invalid home college abbreviation");
      return false;
    }
    if (!isValidCollegeAbbrev(awayCollege)) {
      toast.error("Invalid away college abbreviation");
      return false;
    }
    if (!isValidSport(sport)) {
      toast.error("Invalid sport");
      return false;
    }
    return true;
  };

  const handleUnscoreMatch = async () => {
    setUndoLoading(true);

    if (!matchId) {
      toast.error("Error fetching match id");
      return;
    }

    try {
      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch("/api/functions/undoScoreMatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          matchId: String(matchId).trim(),
          year: String(year),
        }),
      });

      if (response.ok) {
        if (setUnscored) setUnscored(true); // set unscored to hide table row
        toast.success("Successfully unscored match");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error) {
      const errorMessage =
        "Undo score failed: " + (error as Error)?.message ||
        "An unknown error occurred. Please try again.";
      toast.error(errorMessage);
    } finally {
      setUndoLoading(false);
      setModalOpen(false); // Hide modal after processing
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!match) {
      toast.error("No match data available for editing.");
      return;
    }

    e.preventDefault();
    setEditLoading(true);
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

    data["id"] = match.id;

    const home_college = data["home_college"];
    const away_college = data["away_college"];
    const sport = data["sport"];

    if (!validateEditInput(home_college, away_college, sport)) {
      setEditLoading(false);
      return;
    }

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

      toast.success("Match updated successfully! Reload page to view changes!");

      setModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update match");
    } finally {
      setEditLoading(false);
    }
  };

  if (seasonLoading) {
    return <LoadingScreen />;
  }

  if (!match) {
    return null;
  }

  const scoringSectionEnabled = false;

  const matchIsScored = match.winner !== null;

  // get local timestamp for modal
  const dt = match.timestamp ? new Date(match.timestamp) : null;
  const localDateTime = dt
    ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(dt.getDate()).padStart(2, "0")}T${String(
        dt.getHours()
      ).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
    : "";

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
                  Location Extra (field number, etc.)
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
                  defaultValue={localDateTime}
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

            {/* Conditionally render scoring section if match is scored. For now it is just disabled. */}
            {scoringSectionEnabled && match && matchIsScored && (
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
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 border border-blue-700"
                disabled={editLoading}
              >
                {editLoading ? (
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
                disabled={undoLoading}
              >
                {undoLoading ? (
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
