"use client";

import React, { useState, useEffect, ChangeEvent, useCallback } from "react";
import { toast } from "react-toastify";
import { FaSpinner } from "react-icons/fa";
import {
  sports,
  currentYear,
  collegeNamesList,
  toCollegeName,
  toCollegeAbbreviation,
  toTimestamp,
  parseTournamentCSV,
  validateTournamentData,
  TOURNAMENT_SLOT_COUNT,
} from "@src/utils/helpers";
import {
  ParsedMatch,
  PlacementPoints,
  Tournament,
  TournamentData,
} from "@src/types/components";
import { useSeason } from "@src/context/SeasonContext";

// Slot labels mirror the bracket the backend builds, so an admin filling the
// table can see which row is which round without cross-referencing the docs.
const SLOT_ROUNDS: Record<number, string> = {
  1: "Bye",
  2: "Round 1",
  3: "Round 1",
  4: "Round 1",
  5: "Quarterfinal",
  6: "Quarterfinal",
  7: "Bye",
  8: "Round 1",
  9: "Round 1",
  10: "Round 1",
  11: "Quarterfinal",
  12: "Quarterfinal",
  13: "Semifinal",
  14: "Semifinal",
  15: "Final",
  16: "Third Place",
};

const buildEmptyMatches = (): ParsedMatch[] =>
  Array.from({ length: TOURNAMENT_SLOT_COUNT }, (_, i) => ({
    match_slot: i + 1,
    away_college: "",
    away_seed: 0,
    home_college: "",
    home_seed: 0,
    location: "",
    timestamp: "",
    date: "",
    time: "",
    location_extra: "",
    division: "none",
  }));

const DEFAULT_PLACEMENT: PlacementPoints = { first: 20, second: 15, third: 10 };

/**
 * The API proxy forwards upstream failures as raw text, so an error response is
 * often HTML rather than JSON. Reading it with response.json() throws a parse
 * error that masks the real status, so decode it defensively instead.
 */
const readResponse = async (
  response: Response
): Promise<Record<string, any>> => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 200) };
  }
};

const inputClass =
  "w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100";
const headerCellClass =
  "border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-2 text-left whitespace-nowrap";
const cellClass = "border border-gray-300 dark:border-gray-700 p-2";

const TournamentAdminPanel: React.FC = () => {
  const { currentSeason, seasonLoading } = useSeason();
  const year = currentSeason?.year || currentYear;

  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [placementPoints, setPlacementPoints] =
    useState<PlacementPoints>(DEFAULT_PLACEMENT);
  const [matches, setMatches] = useState<ParsedMatch[]>(buildEmptyMatches);
  const [creating, setCreating] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string>("");
  const [listError, setListError] = useState<string>("");

  const loadTournaments = useCallback(async () => {
    try {
      setListLoading(true);
      setListError("");
      const response = await fetch(
        `/api/functions/getTournaments?year=${encodeURIComponent(year)}`
      );
      const data = await readResponse(response);

      if (response.status === 404) {
        // The proxy route exists, so a 404 means the upstream cloud function is
        // missing -- almost always because it has not been deployed yet.
        setListError(
          "The tournaments service is unreachable. If this is a new deploy, run `firebase deploy --only functions`."
        );
        return;
      }
      if (!response.ok) {
        setListError(data.error || "Could not load tournaments.");
        return;
      }

      setTournaments(data.tournaments || []);
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "Could not load tournaments."
      );
    } finally {
      setListLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleChange = (
    index: number,
    field: keyof ParsedMatch,
    value: string
  ) => {
    const numberFields: (keyof ParsedMatch)[] = [
      "match_slot",
      "away_seed",
      "home_seed",
    ];
    setMatches((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: numberFields.includes(field) ? Number(value) : value,
      };
      return updated;
    });
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const csvText = e.target?.result as string;
        if (!csvText) return;
        setMatches(parseTournamentCSV(csvText, year));
        toast.success("CSV file uploaded!");
      } catch (err: any) {
        toast.error(
          err.message || "Error parsing CSV file. Please check the format."
        );
      } finally {
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Give the tournament a name.");
      return;
    }
    if (!sport) {
      toast.error("Pick a sport.");
      return;
    }

    // The date and time columns are what admins actually edit; the timestamp
    // the backend stores is derived from them at submit time.
    const withTimestamps = matches.map((match) => {
      if (match.date && match.time) {
        const timestamp = toTimestamp(match.date, match.time, year);
        if (timestamp !== null) return { ...match, timestamp };
      }
      return match;
    });

    if (!validateTournamentData(withTimestamps)) return;

    const tournamentData: TournamentData = {
      name: name.trim(),
      sport,
      matches: withTimestamps,
      placement_points: placementPoints,
    };

    try {
      setCreating(true);
      const response = await fetch("/api/functions/createTournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentData }),
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(
          data.error ||
            (response.status === 404
              ? "Tournaments service unreachable -- deploy the cloud functions first."
              : "Failed to create tournament")
        );
      }
      toast.success(`Tournament '${name.trim()}' created!`);
      setName("");
      setMatches(buildEmptyMatches());
      setPlacementPoints(DEFAULT_PLACEMENT);
      loadTournaments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (tournament: Tournament, force = false) => {
    if (
      !force &&
      !window.confirm(
        `Delete '${tournament.name}' and its ${tournament.matches.length} matches?`
      )
    ) {
      return;
    }

    try {
      setDeletingId(tournament.id);
      const response = await fetch("/api/functions/deleteTournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: tournament.id, force }),
      });
      const data = await readResponse(response);

      // Scored matches block a plain delete so their points are not stranded;
      // the admin gets one explicit chance to override.
      if (response.status === 409 && !force) {
        if (window.confirm(`${data.error}\n\nDelete anyway?`)) {
          await handleDelete(tournament, true);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete tournament");
      }
      toast.success(`Deleted '${tournament.name}'`);
      loadTournaments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setDeletingId("");
    }
  };

  if (seasonLoading) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Existing tournaments */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h2 className="text-lg font-semibold mb-3">
          Tournaments in {year}
        </h2>
        {listLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : listError ? (
          <p className="text-sm rounded border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-2">
            {listError}
          </p>
        ) : tournaments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tournaments yet this season.
          </p>
        ) : (
          <ul className="space-y-2">
            {tournaments.map((tournament) => (
              <li
                key={tournament.id}
                className="flex items-center justify-between gap-4 rounded border border-gray-200 dark:border-gray-700 px-3 py-2"
              >
                <div>
                  <div className="font-medium">{tournament.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {tournament.sport} · {tournament.placement_points?.first}/
                    {tournament.placement_points?.second}/
                    {tournament.placement_points?.third} pts for top 3
                  </div>
                </div>
                <button
                  className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  disabled={deletingId === tournament.id}
                  onClick={() => handleDelete(tournament)}
                >
                  {deletingId === tournament.id ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Create form */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h2 className="text-lg font-semibold mb-1">Create a tournament</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Matches are added to the{" "}
          <span className="font-semibold">{year}</span> season and count toward
          standings like any other game.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <label className="block">
            <span className="text-sm font-medium">Name</span>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="One Day Volleyball Tournament"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Sport</span>
            <select
              className={inputClass}
              value={sport}
              onChange={(e) => setSport(e.target.value)}
            >
              <option value="">Select Sport</option>
              {sports.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-4">
          <span className="text-sm font-medium">
            Placement points (on top of points per win)
          </span>
          <div className="grid grid-cols-3 gap-3 mt-1">
            {(["first", "second", "third"] as const).map((key, i) => (
              <label key={key} className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {["1st", "2nd", "3rd"][i]}
                </span>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={placementPoints[key]}
                  onChange={(e) =>
                    setPlacementPoints((prev) => ({
                      ...prev,
                      [key]: Number(e.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">
            Upload CSV (match slot, away college, away seed, home college, home
            seed, date, time, location, location extra)
          </label>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse mb-4 text-sm">
            <thead>
              <tr>
                <th className={headerCellClass}>Slot</th>
                <th className={headerCellClass}>Round</th>
                <th className={headerCellClass}>Away College</th>
                <th className={headerCellClass}>Away Seed</th>
                <th className={headerCellClass}>Home College</th>
                <th className={headerCellClass}>Home Seed</th>
                <th className={headerCellClass}>Date</th>
                <th className={headerCellClass}>Time</th>
                <th className={headerCellClass}>Location</th>
                <th className={headerCellClass}>Location Extra</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match, index) => (
                <tr
                  key={match.match_slot}
                  className={
                    match.match_slot === 15
                      ? "bg-amber-100/70 dark:bg-amber-700/30"
                      : match.match_slot === 16
                      ? "bg-orange-100/70 dark:bg-orange-800/30"
                      : "bg-gray-50 dark:bg-gray-800/40"
                  }
                >
                  <td className={cellClass}>{match.match_slot}</td>
                  <td className={`${cellClass} whitespace-nowrap text-xs`}>
                    {SLOT_ROUNDS[match.match_slot]}
                  </td>
                  <td className={cellClass}>
                    <select
                      className={inputClass}
                      value={toCollegeName[match.away_college] || ""}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "away_college",
                          toCollegeAbbreviation[e.target.value] || ""
                        )
                      }
                    >
                      <option value="">Select College</option>
                      {collegeNamesList.map((college) => (
                        <option key={college} value={college}>
                          {college}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={cellClass}>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      value={match.away_seed}
                      onChange={(e) =>
                        handleChange(index, "away_seed", e.target.value)
                      }
                    />
                  </td>
                  <td className={cellClass}>
                    <select
                      className={inputClass}
                      value={toCollegeName[match.home_college] || ""}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "home_college",
                          toCollegeAbbreviation[e.target.value] || ""
                        )
                      }
                    >
                      <option value="">Select College</option>
                      {collegeNamesList.map((college) => (
                        <option key={college} value={college}>
                          {college}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={cellClass}>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      value={match.home_seed}
                      onChange={(e) =>
                        handleChange(index, "home_seed", e.target.value)
                      }
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      className={inputClass}
                      value={match.date || ""}
                      placeholder="9/15"
                      onChange={(e) =>
                        handleChange(index, "date", e.target.value)
                      }
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      className={inputClass}
                      value={match.time || ""}
                      placeholder="7:00 PM"
                      onChange={(e) =>
                        handleChange(index, "time", e.target.value)
                      }
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      className={inputClass}
                      value={match.location}
                      placeholder="Payne Whitney"
                      onChange={(e) =>
                        handleChange(index, "location", e.target.value)
                      }
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      className={inputClass}
                      value={match.location_extra || ""}
                      placeholder="Court 1"
                      onChange={(e) =>
                        handleChange(index, "location_extra", e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-2"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating && <FaSpinner className="animate-spin" />}
          {creating ? "Creating…" : "Create Tournament"}
        </button>
      </section>
    </div>
  );
};

export default TournamentAdminPanel;
