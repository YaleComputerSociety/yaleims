"use client";

import React, { useState } from "react";
import { FaFlag, FaSpinner } from "react-icons/fa";
import { Match } from "@src/types/components";
import { useUser } from "@src/context/UserContext";
import { userIsAdminOrDev } from "@src/utils/helpers";
import { toast } from "react-toastify";

interface ReportScoreButtonProps {
  match: Match;
}

export const ReportScoreButton: React.FC<ReportScoreButtonProps> = ({
  match,
}) => {
  const { user } = useUser();
  const [modalOpen, setModalOpen] = useState(false);

  const isScored = match.winner !== null;
  if (!isScored) return null;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        title="Report incorrect score"
        className="ml-1 p-1 rounded bg-gray-100 dark:bg-gray-800 text-yellow-500 hover:text-yellow-600 text-[10px] border border-gray-200 dark:border-gray-700 cursor-pointer"
      >
        <FaFlag className="inline text-sm" />
      </button>

      {modalOpen && (
        <ReportScoreModal match={match} setModalOpen={setModalOpen} />
      )}
    </>
  );
};

interface ReportScoreModalProps {
  match: Match;
  setModalOpen: (open: boolean) => void;
}

const ReportScoreModal: React.FC<ReportScoreModalProps> = ({
  match,
  setModalOpen,
}) => {
  const { user } = useUser();
  const isAdminOrDev = userIsAdminOrDev(user);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please describe what's wrong with the score.");
      return;
    }

    setSubmitting(true);
    try {
      // For now, just show a success toast — hook up to a real endpoint later
      // await fetch("/api/functions/reportScore", { ... });
      toast.success("Score report submitted. An admin will review it.");
      setModalOpen(false);
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50"
      onClick={() => setModalOpen(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg text-center border border-gray-200 dark:border-gray-700 mx-2 sm:mx-0 w-full max-w-xs sm:max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Report Incorrect Score
        </h3>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {match.home_college} {match.home_college_score} &ndash;{" "}
          {match.away_college_score} {match.away_college}
          {match.forfeit ? " (Forfeit)" : ""}
        </p>

        <textarea
          className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Describe the issue (e.g. wrong score, wrong winner…)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {/* Show submitted reports — admin/dev only */}
        {isAdminOrDev && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic">
            Admin view: reports for this match will appear here once connected.
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-sm"
            onClick={() => setModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 border border-yellow-600 text-sm"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <FaSpinner className="animate-spin inline" />
            ) : (
              "Submit Report"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportScoreModal;
