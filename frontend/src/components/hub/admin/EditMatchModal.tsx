"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import { FaEdit, FaSpinner } from "react-icons/fa";
import { useSeasonDetail } from "@/context/SeasonContext";
import { hasRole, useSession } from "@/context/SessionContext";
import { editMatch, undoScore, type Match } from "@/lib/api/matches";
import { COLLEGES } from "@/lib/colleges";

interface EditMatchModalProps {
  setModalOpen: (value: React.SetStateAction<boolean>) => void;
  match: Match;
  /** Called after the score was undone (the scores page hides the row). */
  setUnscored?: (value: React.SetStateAction<boolean>) => void;
}

type EditMatchButtonProps = Omit<EditMatchModalProps, "setModalOpen">;

export const EditMatchButton: React.FC<EditMatchButtonProps> = ({ match, setUnscored }) => {
  const { viewer } = useSession();
  const isAdmin = hasRole(viewer, "admin", "dev");
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);

  if (!isAdmin) return null;

  return (
    <>
      <span
        onClick={() => setEditModalOpen(true)}
        className="ml-2 p-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 font-mono text-[10px] border border-gray-200 dark:border-gray-700 cursor-pointer"
      >
        <FaEdit className="inline text-base" />
      </span>

      {editModalOpen && <EditMatchModal match={match} setModalOpen={setEditModalOpen} setUnscored={setUnscored} />}
    </>
  );
};

const isCollegeId = (id: string) => COLLEGES.some((c) => c.id === id);

/** "2026-09-09T16:00" in the admin's time zone (what a datetime-local input shows). */
function localDateTime(iso: string): string {
  const dt = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export const EditMatchModal: React.FC<EditMatchModalProps> = ({ setModalOpen, match, setUnscored }) => {
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [undoLoading, setUndoLoading] = useState<boolean>(false);
  const sports = useSeasonDetail(match.seasonId)?.sports ?? [];

  const handleUnscoreMatch = async () => {
    setUndoLoading(true);
    try {
      await undoScore(match.seasonId, match.id);
      setUnscored?.(true);
      toast.success("Successfully unscored match");
    } catch (error) {
      toast.error("Undo score failed: " + (error as Error).message);
    } finally {
      setUndoLoading(false);
      setModalOpen(false);
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    const home = field("home_college");
    const away = field("away_college");
    // A bracket side waiting for a winner stays empty.
    if ((home || match.homeCollegeId) && !isCollegeId(home)) {
      toast.error("Invalid home college abbreviation");
      return;
    }
    if ((away || match.awayCollegeId) && !isCollegeId(away)) {
      toast.error("Invalid away college abbreviation");
      return;
    }
    // datetime-local hands back a naive "2026-09-09T16:00"; read it in the admin's time zone.
    const start = field("timestamp") ? new Date(field("timestamp")) : null;
    if (start && isNaN(start.getTime())) {
      toast.error("Invalid date/time");
      return;
    }

    setEditLoading(true);
    try {
      await editMatch(match.seasonId, match.id, {
        homeCollegeId: home || undefined,
        awayCollegeId: away || undefined,
        venue: field("location") || null,
        venueDetail: field("location_extra") || null,
        startsAt: start?.toISOString(),
        sportId: field("sport") || undefined,
      });
      toast.success("Match updated successfully! Reload page to view changes!");
      setModalOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const matchIsScored = match.result !== null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg text-center border border-gray-200 dark:border-gray-700 mx-2 sm:mx-0 w-full max-w-xs sm:max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Edit Match
        </h3>
        <form className="flex flex-col gap-3 mb-6" onSubmit={handleEdit}>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                Home College
              </label>
              <input
                className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                defaultValue={match.homeCollegeId ?? ""}
                name="home_college"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                Away College
              </label>
              <input
                className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                defaultValue={match.awayCollegeId ?? ""}
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
                defaultValue={match.venue ?? ""}
                name="location"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                Location Extra (field number, etc.)
              </label>
              <input
                className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                defaultValue={match.venueDetail ?? ""}
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
                defaultValue={localDateTime(match.startsAt)}
                name="timestamp"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                Sport
              </label>
              <select
                className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                defaultValue={match.sportId}
                name="sport"
              >
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

        {matchIsScored && (
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
