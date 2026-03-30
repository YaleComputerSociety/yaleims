"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaFlag, FaSpinner, FaCheck } from "react-icons/fa";
import { MdClose } from "react-icons/md";
import { Match } from "@src/types/components";
import { useUser } from "@src/context/UserContext";
import { userIsAdminOrDev } from "@src/utils/helpers";
import { toast } from "react-toastify";

export interface ScoreReportItem {
  id: string;
  reason: string;
  reportedBy: string;
  reportedByEmail: string;
  reportedAt: { _seconds: number; _nanoseconds?: number } | string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: { _seconds: number; _nanoseconds?: number } | string;
  matchId: string;
  season: string;
  matchHomeCollege?: string;
  matchAwayCollege?: string;
  homeScore?: number;
  awayScore?: number;
  sport?: string;
}

interface ReportScoreButtonProps {
  match: Match;
  seasonId?: string;
}

export const ReportScoreButton: React.FC<ReportScoreButtonProps> = ({
  match,
  seasonId,
}) => {
  const { user } = useUser();
  const [modalOpen, setModalOpen] = useState(false);

  const isScored = match.winner !== null;
  if (!isScored) return null;

  const handleClick = () => {
    if (!user) {
      const from = encodeURIComponent("/games");
      window.location.href = `/api/auth/login?from=${from}`;
      return;
    }
    setModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        title="Report incorrect score"
        className="ml-1 p-1 rounded bg-gray-100 dark:bg-gray-800 text-yellow-500 hover:text-yellow-600 text-[10px] border border-gray-200 dark:border-gray-700 cursor-pointer"
      >
        <FaFlag className="inline text-sm" />
      </button>

      {modalOpen && (
        <ReportScoreModal
          match={match}
          seasonId={seasonId}
          setModalOpen={setModalOpen}
        />
      )}
    </>
  );
};

interface ReportScoreModalProps {
  match: Match;
  seasonId?: string;
  setModalOpen: (open: boolean) => void;
}

function formatReportDate(raw: { _seconds: number } | string): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw._seconds === "number") {
    return new Date(raw._seconds * 1000).toLocaleString();
  }
  return "—";
}

const ReportScoreModal: React.FC<ReportScoreModalProps> = ({
  match,
  seasonId,
  setModalOpen,
}) => {
  const { user } = useUser();
  const isAdminOrDev = userIsAdminOrDev(user);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState<ScoreReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const season = seasonId ?? "2025-2026";

  const fetchReports = useCallback(async () => {
    if (!season || !match.id) return;
    setLoadingReports(true);
    try {
      const res = await fetch(
        `/api/functions/getScoreReports?season=${encodeURIComponent(season)}&matchId=${encodeURIComponent(String(match.id))}`
      );
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
      }
    } catch {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, [season, match.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("overflow-hidden");
    return () => {
      html.classList.remove("overflow-hidden");
    };
  }, []);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please describe what's wrong with the score.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/functions/reportScore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: String(match.id),
          season,
          reason: reason.trim(),
          matchHomeCollege: match.home_college,
          matchAwayCollege: match.away_college,
          homeScore: match.home_college_score,
          awayScore: match.away_college_score,
          sport: match.sport,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to submit");
      }
      toast.success("Score report submitted. An admin will review it.");
      setReason("");
      fetchReports();
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (report: ScoreReportItem) => {
    if (!isAdminOrDev) return;
    setResolvingId(report.id);
    try {
      const res = await fetch("/api/functions/resolveScoreReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          matchId: String(match.id),
          season,
        }),
      });
      if (!res.ok) throw new Error("Failed to resolve");
      toast.success("Report marked as resolved.");
      fetchReports();
    } catch {
      toast.error("Failed to mark as resolved.");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-85 w-[100%] h-[100%] flex-col"
      onClick={() => setModalOpen(false)}
    >
      <div
        className="w-[80%] md:w-[60%] h-[80%] bg-gray-200 dark:bg-custom_gray rounded-lg flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 relative justify-between flex w-full rounded-t-lg p-4 flex-row border-b-2 border-gray-300 dark:border-black bg-gray-200 dark:bg-custom_gray">
          <h2 className="text-xl font-semibold">Report Incorrect Score</h2>
          <button
            onClick={() => setModalOpen(false)}
            className="text-gray-600 hover:text-white text-xl font-bold"
          >
            <MdClose />
          </button>
        </div>

        <div className="flex flex-col h-full overflow-hidden">
          <div className="pl-4 pr-4 pt-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {match.sport ? `${match.sport} • ` : ""}
              {match.home_college} {match.home_college_score} &ndash;{" "}
              {match.away_college_score} {match.away_college}
              {match.forfeit ? " (Forfeit)" : ""}
            </p>

            {/* Existing reports */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {reports.length > 0 ? "Reports for this match" : "No reports yet"}
              </h4>
              {loadingReports ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Loading...
                </p>
              ) : reports.length > 0 ? (
                <div className="space-y-2 pr-1">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className={`p-2 rounded border text-xs ${
                        r.resolved
                          ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                          : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      <p className="text-gray-800 dark:text-gray-200">{r.reason}</p>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">
                        — {r.reportedBy} ({formatReportDate(r.reportedAt)})
                        {r.resolved && (
                          <span className="ml-2 text-green-600 dark:text-green-400">
                            ✓ Resolved{r.resolvedBy ? ` by ${r.resolvedBy}` : ""}
                          </span>
                        )}
                      </p>
                      {isAdminOrDev && !r.resolved && (
                        <button
                          type="button"
                          className="mt-2 text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          onClick={() => handleResolve(r)}
                          disabled={resolvingId === r.id}
                        >
                          {resolvingId === r.id ? (
                            <FaSpinner className="animate-spin inline" />
                          ) : (
                            <>
                              <FaCheck className="inline mr-1" /> Mark resolved
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex-shrink-0 p-4 border-t border-gray-300 dark:border-black bg-gray-200 dark:bg-custom_gray">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Add new report
            </h4>
            <div className="relative">
              <textarea
                className="w-full rounded-lg px-3 py-2 pb-12 pr-28 text-sm bg-gray-300 dark:bg-black dark:text-white border-0 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                rows={2}
                placeholder="Describe the issue (e.g. wrong score, wrong winner…)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button
                type="button"
                className="absolute bottom-3 right-3 px-3 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-lg shadow-md transition transform duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed text-sm"
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
      </div>
    </div>
  );
};

export default ReportScoreModal;
