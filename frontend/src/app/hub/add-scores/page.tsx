"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Matchv2 as Match } from "@src/types/components";
import MatchCard from "@src/components/AddScores/MatchCard";
import LoadingScreen from "@src/components/LoadingScreen";
import { useSeason } from "@src/context/SeasonContext";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import { currentYear, emojiMap, toCollegeName } from "@src/utils/helpers";
import UndoScoreMatchModal from "@src/components/AddScores/UndoScoreMatchModal";
import PageHeading from "@src/components/PageHeading";
import AddScoresFilterBar, {
  AddScoresSortOrder,
} from "@src/components/AddScores/AddScoresFilterBar";

const matchTime = (match: Match) =>
  match.timestamp._seconds * 1000 + match.timestamp._nanoseconds / 1000000;

const AddScoresPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unscoreId, setUnscoreId] = useState<string>(""); // For unscore input
  const [unscoreMessage, setUnscoreMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false); // For confirmation modal
  const [refreshKey, setRefreshKey] = useState(0); // For refetching matches
  const [sportFilter, setSportFilter] = useState<string>("");
  const [collegeFilter, setCollegeFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<AddScoresSortOrder>("oldest");
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set());
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
          setScoredIds(new Set());
        }
      } catch (error) {
        console.error("Failed to fetch matches:", error);
      } finally {
        setLoading(false);
      }
    };

    if (seasonLoading) return;
    fetchMatches();
  }, [refreshKey, year, seasonLoading]);

  const matchList = useMemo(
    () => (Array.isArray(matches) ? matches : []),
    [matches]
  );

  // only offer sports / colleges that actually have matches waiting, with counts
  const sportOptions = useMemo(() => {
    const counts = new Map<string, number>();
    matchList.forEach((m) => counts.set(m.sport, (counts.get(m.sport) || 0) + 1));
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sport, count]) => ({
        value: sport,
        label: `${emojiMap[sport] ?? ""} ${sport} (${count})`.trim(),
      }));
  }, [matchList]);

  const collegeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    matchList.forEach((m) => {
      [m.home_college, m.away_college].forEach((c) => {
        const name = toCollegeName[c] || c;
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([college, count]) => ({
        value: college,
        label: `${college} (${count})`,
      }));
  }, [matchList]);

  const sortedMatches = useMemo(
    () =>
      [...matchList].sort((a, b) =>
        sortOrder === "oldest"
          ? matchTime(a) - matchTime(b)
          : matchTime(b) - matchTime(a)
      ),
    [matchList, sortOrder]
  );

  const visibleIds = useMemo(() => {
    const query = search.trim().toLowerCase();
    return new Set(
      matchList
        .filter((m) => !sportFilter || m.sport === sportFilter)
        .filter(
          (m) =>
            !collegeFilter ||
            toCollegeName[m.home_college] === collegeFilter ||
            toCollegeName[m.away_college] === collegeFilter
        )
        .filter((m) => !query || String(m.id).toLowerCase().includes(query))
        .map((m) => m.id)
    );
  }, [matchList, sportFilter, collegeFilter, search]);

  const handleScored = (matchId: string) =>
    setScoredIds((prev) => new Set(prev).add(matchId));

  const remainingCount = matchList.filter((m) => !scoredIds.has(m.id)).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true); // Show confirmation dialog
  };

  if (loading || seasonLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen ">
      <PageHeading heading="Update Scores" />
      <div className="min-h-screen pt-10 px-4 sm:px-8 md:px-10">
        <div className="flex-col items-center mx-auto md:mx-20">
          <h1 className="md:text-2xl text-xl font-bold text-center mb-8 pt-8 text-blue-600">
            Matches To Be Scored
          </h1>

          <div className="flex flex-col gap-4 items-center">
            {matchList.length > 0 && (
              <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
                <AddScoresFilterBar
                  sportOptions={sportOptions}
                  collegeOptions={collegeOptions}
                  sportFilter={sportFilter}
                  collegeFilter={collegeFilter}
                  search={search}
                  sortOrder={sortOrder}
                  onSportChange={setSportFilter}
                  onCollegeChange={setCollegeFilter}
                  onSearchChange={setSearch}
                  onSortOrderChange={setSortOrder}
                />
                <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span>
                    Showing {visibleIds.size} of {matchList.length}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span>{remainingCount} left to score</span>
                  {scoredIds.size > 0 && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <button
                        onClick={() => setRefreshKey((k) => k + 1)}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Refresh list
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Matches Section */}
            {!Array.isArray(matches) ? (
              <p>Something went wrong. Please try again later.</p>
            ) : matchList.length === 0 ? (
              <p>No past matches to be scored</p>
            ) : (
              <>
                {visibleIds.size === 0 && (
                  <p className="text-gray-500 dark:text-gray-400">
                    No matches to be scored for these filters
                  </p>
                )}
                {/* hide rather than unmount so typed scores and "Scored!" state survive filter changes */}
                {sortedMatches.map((match) => (
                  <div
                    key={match.id}
                    className={visibleIds.has(match.id) ? "w-full" : "hidden"}
                  >
                    <MatchCard match={match} onScored={handleScored} />
                  </div>
                ))}
              </>
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
    </div>
  );
};

AddScoresPage.displayName = "AddScoresPage";

export default withRoleProtectedRoute(AddScoresPage, ["admin", "dev"]);
