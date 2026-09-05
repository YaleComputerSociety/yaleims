"use client";

import PageHeading from "@src/components/PageHeading";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React, { useEffect, useRef, useState, ChangeEvent } from "react";
import { colleges, currentYear, sports, toTimestamp } from "@src/utils/helpers";
import { toast } from "react-toastify";
import { useSeason } from "@src/context/SeasonContext";
import LoadingScreen from "@src/components/LoadingScreen";
import { FaSpinner } from "react-icons/fa";

interface Schedule {
  matches: ScheduleMatch[];
  sport: string;
  season: string;
}

interface ScheduleMatch {
  timestamp: string;
  homeCollege: string;
  awayCollege: string;
  location: string;
  locationExtra?: string;
}

const TEMPLATE_URL =
  "https://docs.google.com/spreadsheets/d/1rmyTsJwoXkJ0MbGh6MjZXF0wfWnDlc8-bFTkHIRPVmQ/edit?usp=sharing";

const validCollegeAbbrs = colleges.map((c) => c.id);

const normalizeHeader = (cell: string) =>
  cell.trim().replace(/^"|"$/g, "").toLowerCase().replace(/[\s_]/g, "");

// Accepted spellings per column, so both the Google Sheets template and the
// generated *_schedule_formatted.csv files can be uploaded as-is.
const COLUMN_ALIASES = {
  date: ["date"],
  time: ["time"],
  homeCollege: ["homecollege", "home"],
  awayCollege: ["awaycollege", "away"],
  location: ["location"],
  locationExtra: ["locationextra", "room"],
  sport: ["sport"],
};

/** Split one CSV line, honouring "quoted, fields" and "" escapes. */
const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
};

const UploadSchedulePage = () => {
  const { currentSeason, pastSeasons, seasonLoading } = useSeason();
  const pastYears = pastSeasons?.years || [];

  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [season, setSeason] = useState<string>(
    currentSeason?.year || currentYear
  );
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseScheduleCSV = (
    csvText: string,
    sport: string,
    season: string
  ): Schedule | null => {
    const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      setError("The file has no data rows.");
      return null;
    }

    const headerCells = splitCsvLine(lines[0]).map(normalizeHeader);
    const columnOf = (field: keyof typeof COLUMN_ALIASES) =>
      headerCells.findIndex((cell) => COLUMN_ALIASES[field].includes(cell));

    // Columns are located by name rather than position: files in the wild put
    // home before away and vice versa, and reading blind by index silently
    // imported every match backwards.
    const idx = {
      date: columnOf("date"),
      time: columnOf("time"),
      homeCollege: columnOf("homeCollege"),
      awayCollege: columnOf("awayCollege"),
      location: columnOf("location"),
      locationExtra: columnOf("locationExtra"),
      sport: columnOf("sport"),
    };

    const missing = (
      ["date", "time", "homeCollege", "awayCollege", "location"] as const
    ).filter((field) => idx[field] === -1);
    if (missing.length > 0) {
      setError(
        `Invalid CSV format. Missing column(s): ${missing.join(", ")}. ` +
          "Header must include: date, time, awayCollege, homeCollege, location."
      );
      return null;
    }

    const matches: ScheduleMatch[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = splitCsvLine(lines[i]);
      const rowNum = i + 1; // 1-based for user (header is row 1)
      const valueAt = (column: number) =>
        column === -1 ? "" : (row[column] ?? "").trim();

      const requiredColumns = Math.max(
        idx.date,
        idx.time,
        idx.homeCollege,
        idx.awayCollege,
        idx.location
      );
      if (row.length <= requiredColumns) {
        setError(
          `Row ${rowNum}: Not enough columns (expected at least ${
            requiredColumns + 1
          }).`
        );
        return null;
      }

      const date = valueAt(idx.date);
      const time = valueAt(idx.time);
      const homeCollege = valueAt(idx.homeCollege);
      const awayCollege = valueAt(idx.awayCollege);
      const location = valueAt(idx.location);
      const locationExtra = valueAt(idx.locationExtra);
      const rowSport = valueAt(idx.sport);

      // Date: M/D or MM/DD, with an optional 4-digit year (the season supplies
      // the year when it is omitted).
      const dateMatch = date.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
      if (!dateMatch) {
        setError(
          `Row ${rowNum}: Invalid date format (expected M/D, MM/DD or M/D/YYYY).`
        );
        return null;
      }

      // Validate time format: H:MM AM/PM
      const timeRegex = /^\d{1,2}:\d{2}\s?(AM|PM)$/i;
      if (!timeRegex.test(time)) {
        setError(`Row ${rowNum}: Invalid time format (expected H:MM AM/PM).`);
        return null;
      }

      // convert date and time to ISO string timestamp
      const timestamp = toTimestamp(date, time, season);
      if (!timestamp || isNaN(new Date(timestamp).getTime())) {
        setError(`Row ${rowNum}: Invalid date/time combination.`);
        return null;
      }

      // A year in the file that disagrees with the chosen season means the
      // wrong season is selected -- say so instead of shifting the match.
      const statedYear = dateMatch[3];
      if (statedYear && new Date(timestamp).getFullYear() !== Number(statedYear)) {
        setError(
          `Row ${rowNum}: Date ${date} does not fall in the ${season} season.`
        );
        return null;
      }

      if (!validCollegeAbbrs.includes(homeCollege)) {
        setError(
          `Row ${rowNum}: Invalid home college abbreviation: '${homeCollege}'.`
        );
        return null;
      }
      if (!validCollegeAbbrs.includes(awayCollege)) {
        setError(
          `Row ${rowNum}: Invalid away college abbreviation: '${awayCollege}'.`
        );
        return null;
      }
      if (homeCollege === awayCollege) {
        setError(`Row ${rowNum}: A college cannot play itself.`);
        return null;
      }
      if (!location || location.length === 0) {
        setError(`Row ${rowNum}: Missing location.`);
        return null;
      }
      // Every match in one upload is filed under the selected sport, so a sport
      // column that disagrees is a sign the wrong sport is selected.
      if (rowSport && rowSport.toLowerCase() !== sport.toLowerCase()) {
        setError(
          `Row ${rowNum}: File says '${rowSport}' but '${sport}' is selected.`
        );
        return null;
      }

      const match: ScheduleMatch = {
        timestamp,
        homeCollege,
        awayCollege,
        location,
      };
      if (locationExtra !== "") {
        match.locationExtra = locationExtra;
      }
      matches.push(match);
    }
    return { matches, sport, season };
  };

  const applyCsv = (text: string, sport: string, forSeason: string): boolean => {
    const parsedSchedule = parseScheduleCSV(text, sport, forSeason);
    if (parsedSchedule) {
      setIsValid(true);
      setSchedule(parsedSchedule);
      setError("");
      return true;
    }
    setIsValid(false);
    setSchedule(null);
    return false;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setIsValid(false);
    setFile(null);
    setFileName("");
    setCsvText("");
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      if (applyCsv(text, selectedSport, season)) {
        setFile(f);
        setFileName(f.name);
      } else {
        // Clear the file input so user can re-upload the same file
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(f);
  };

  // The sport and season are baked into the parsed schedule (they set the year
  // and the target collection), so changing either has to re-parse the file --
  // otherwise the upload silently uses whatever was selected at drop time.
  useEffect(() => {
    if (!csvText) return;
    applyCsv(csvText, selectedSport, season);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSport, season]);

  const handleSeasonChange = (newSeason: string) => {
    setSeason(newSeason);
  };

  const resetState = () => {
    setFile(null);
    setFileName("");
    setIsValid(false);
    setSchedule(null);
    setSelectedSport("");
    setCsvText("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!schedule) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/functions/addSchedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule: schedule,
        }),
      });
      const message = await response.json();

      if (!response.ok) {
        throw new Error(message.error || "Failed to upload schedule");
      }
      resetState();
      toast.success("Schedule uploaded successfully!");
    } catch (error: any) {
      toast.error(
        error.message || "Error uploading schedule. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fileUploadDisabled = selectedSport === "" || season === "";

  if (seasonLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen pt-16 flex flex-col items-center">
      <PageHeading heading="Upload Schedule from CSV" />
      <div className="bg-white/50 dark:bg-black/50 rounded-xl shadow-lg p-4 sm:p-8 mt-8 w-full max-w-lg flex flex-col gap-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
        {/* Sport Dropdown */}
        <div className="flex flex-col gap-2 w-full">
          <label
            htmlFor="sport-select"
            className="font-medium mb-1 text-gray-800 dark:text-gray-200"
          >
            Sport
          </label>
          <select
            id="sport-select"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
          >
            <option value="" disabled>
              Select a sport
            </option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.name}>
                {sport.emoji} {sport.name}
              </option>
            ))}
          </select>
        </div>

        {/* Season Dropdown */}
        <div className="flex flex-col gap-2 w-full">
          <label
            htmlFor="season-select"
            className="font-medium mb-1 text-gray-800 dark:text-gray-200"
          >
            Year
          </label>
          <select
            id="season-select"
            className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={season}
            onChange={(e) => handleSeasonChange(e.target.value)}
          >
            <option value={currentSeason?.year || currentYear}>
              {currentSeason?.year || currentYear}
            </option>
            {pastYears
              .filter((y: string) => y !== (currentSeason?.year || currentYear))
              .map((y: string) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        </div>

        {/* Template and File Upload */}
        <div className="flex flex-col gap-2 w-full items-center sm:flex-row sm:justify-between">
          <button
            type="button"
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer text-blue-700 dark:text-blue-300 font-medium w-full sm:w-auto"
            onClick={() =>
              window.open(TEMPLATE_URL, "_blank", "noopener,noreferrer")
            }
          >
            View Template
          </button>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            id="csv-upload"
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer w-full text-gray-900 dark:text-gray-100"
            onChange={handleFileChange}
            disabled={fileUploadDisabled}
          />
          {fileUploadDisabled && (
            <span className="text-red-600 dark:text-red-400 text-sm mt-1">
              Please select a {selectedSport === "" ? "sport" : "year"} before
              uploading a file.
            </span>
          )}
          {fileName !== "" && (
            <span className="text-gray-700 dark:text-gray-200 text-sm mt-1">
              File: {fileName}
            </span>
          )}
          {error && (
            <span className="text-red-600 dark:text-red-400 text-sm mt-1">
              {error}
            </span>
          )}
        </div>
        <button
          className={`px-4 py-2 rounded text-white font-semibold transition-colors w-full flex items-center justify-center ${
            isValid
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
          }`}
          disabled={!isValid}
          onClick={handleUpload}
        >
          {loading ? (
            <span className="flex items-center justify-center w-full">
              <FaSpinner className="animate-spin text-lg" />
            </span>
          ) : (
            "Upload"
          )}
        </button>
      </div>
    </div>
  );
};

export default withRoleProtectedRoute(UploadSchedulePage, ["admin", "dev"]);
