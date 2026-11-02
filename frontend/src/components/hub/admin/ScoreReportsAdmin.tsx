"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaSpinner, FaCheck } from "react-icons/fa";
import { useSeason } from "@/context/SeasonContext";
import { toast } from "react-toastify";
import { fetchSeasonReports, resolveReport, type SeasonScoreReport } from "@/lib/api/reports";

/** The season's score reports (admins and devs): open ones to resolve, then the resolved. */
const ScoreReportsAdmin: React.FC = () => {
  const { currentSeason } = useSeason();
  const season = currentSeason?.id ?? "";
  const sportName = (sportId: string | undefined) => currentSeason?.sports.find((s) => s.id === sportId)?.name;
  const [reports, setReports] = useState<SeasonScoreReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!season) return;
    setLoading(true);
    try {
      setReports((await fetchSeasonReports(season)).items);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [season]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (report: SeasonScoreReport) => {
    setResolvingId(report.id);
    try {
      await resolveReport(report.seasonId, report.matchId, report.id);
      toast.success("Report marked as resolved.");
      fetchReports();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResolvingId(null);
    }
  };

  const unresolved = reports.filter((r) => r.status !== "resolved");
  const resolved = reports.filter((r) => r.status === "resolved");

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
                        Match: {r.match?.homeCollegeId ?? "?"} vs{" "}
                        {r.match?.awayCollegeId ?? "?"}
                        {r.scoreAtReport.home != null && r.scoreAtReport.away != null
                          ? ` (${r.scoreAtReport.home}-${r.scoreAtReport.away})`
                          : ""}
                      </span>
                      {sportName(r.match?.sportId) && <span>• {sportName(r.match?.sportId)}</span>}
                      <span>• by {r.reporterName} ({new Date(r.reportedAt).toLocaleString()})</span>
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
                      Match {r.matchId} • Resolved by {r.resolverName ?? r.resolvedBy ?? "—"}
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
