"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaSpinner, FaCheck } from "react-icons/fa";
import { useSeason } from "@src/context/SeasonContext";
import { toast } from "react-toastify";

interface ScoreReportItem {
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

function formatReportDate(raw: { _seconds: number } | string): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw._seconds === "number") {
    return new Date(raw._seconds * 1000).toLocaleString();
  }
  return "—";
}

const ScoreReportsAdmin: React.FC = () => {
  const { currentSeason } = useSeason();
  const season = currentSeason?.year ?? "2025-2026";
  const [reports, setReports] = useState<ScoreReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/functions/getScoreReports?season=${encodeURIComponent(season)}&all=true`
      );
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
      } else {
        setReports([]);
      }
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [season]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (report: ScoreReportItem) => {
    setResolvingId(report.id);
    try {
      const res = await fetch("/api/functions/resolveScoreReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          matchId: report.matchId,
          season: report.season,
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

  const unresolved = reports.filter((r) => !r.resolved);
  const resolved = reports.filter((r) => r.resolved);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Score Reports — {season}
        </h3>
        <button
          type="button"
          onClick={fetchReports}
          disabled={loading}
          className="text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <FaSpinner className="animate-spin" />
          <span>Loading reports...</span>
        </div>
      ) : reports.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No score reports for this season.
        </p>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {unresolved.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                Unresolved ({unresolved.length})
              </h4>
              <div className="space-y-2">
                {unresolved.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
                  >
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {r.reason}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Match: {r.matchHomeCollege ?? "?"} vs{" "}
                        {r.matchAwayCollege ?? "?"}
                        {r.homeScore != null && r.awayScore != null
                          ? ` (${r.homeScore}-${r.awayScore})`
                          : ""}
                      </span>
                      {r.sport && <span>• {r.sport}</span>}
                      <span>• by {r.reportedBy} ({formatReportDate(r.reportedAt)})</span>
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-xs px-2 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                Resolved ({resolved.length})
              </h4>
              <div className="space-y-2">
                {resolved.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-through">
                      {r.reason}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Match {r.matchId} • Resolved by {r.resolvedBy ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoreReportsAdmin;
