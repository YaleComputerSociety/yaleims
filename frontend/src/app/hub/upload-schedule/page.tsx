"use client";

import PageHeading from "@src/components/PageHeading";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React, { useRef, useState, ChangeEvent } from "react";
import { colleges, isValidTimestamp, sports } from "@src/utils/helpers";
import { toast } from "react-toastify";

interface Schedule {
  matches: ScheduleMatch[];
  sport: string;
  season: string; // Assuming season is a string, adjust as needed
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

const parseScheduleCSV = (csvText: string, sport: string): Schedule | null => {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  // Check header
  const header = lines[0].toLowerCase().replace(/\s+/g, "");
  if (
    !header.includes("timestamp") ||
    !header.includes("homecollege") ||
    !header.includes("awaycollege") ||
    !header.includes("location")
  ) {
    return null;
  }
  // Determine if locationExtra column is present
  const hasLocationExtra = header.includes("locationextra");
  const matches: ScheduleMatch[] = [];
  // Validate each row
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((v) => v.trim());
    if (row.length < 4) return null;
    // If locationExtra is present, expect 5 columns, else 4
    if (hasLocationExtra && row.length < 5) return null;
    const [timestamp, homeCollege, awayCollege, location, locationExtra] = row;
    if (!isValidTimestamp(timestamp)) return null;
    if (!validCollegeAbbrs.includes(homeCollege)) return null;
    if (!validCollegeAbbrs.includes(awayCollege)) return null;
    if (!location || location.length === 0) return null;
    const match: ScheduleMatch = {
      timestamp,
      homeCollege,
      awayCollege,
      location,
    };
    if (hasLocationExtra && locationExtra && locationExtra.length > 0) {
      match.locationExtra = locationExtra;
    }
    matches.push(match);
  }
  return { matches, sport, season: "2025-2026" };
};

const UploadSchedulePage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>("");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError("");
    setIsValid(false);
    setFile(null);
    setFileName("");
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedSchedule = parseScheduleCSV(text, selectedSport);
      if (parsedSchedule) {
        setFile(f);
        setFileName(f.name);
        setIsValid(true);
        setSchedule(parsedSchedule);
        setError("");
      } else {
        setError("Invalid CSV format. Please use the template.");
      }
    };
    reader.readAsText(f);
  };

  const resetState = () => {
    setFile(null);
    setFileName("");
    setIsValid(false);
    setSchedule(null);
    setSelectedSport("");
    setError("");
  };

  const handleUpload = async () => {
    if (!schedule) {
      return;
    }

    try {
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
    }
  };

  const fileUploadDisabled = selectedSport === "";

  return (
    <div className="min-h-screen pt-20 flex flex-col items-center">
      <PageHeading heading="Upload Schedule from CSV" />
      <div className="bg-white rounded shadow p-8 mt-8 w-full max-w-lg flex flex-col gap-6">
        {/* Sport Dropdown */}
        <div className="flex flex-col gap-2 items-center">
          <label htmlFor="sport-select" className="font-medium mb-1">
            Sport
          </label>
          <select
            id="sport-select"
            className="px-4 py-2 border border-gray-300 rounded w-full"
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
        <div className="flex flex-col gap-2 items-center">
          <button
            type="button"
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors cursor-pointer text-blue-700 font-medium"
            onClick={() =>
              window.open(TEMPLATE_URL, "_blank", "noopener,noreferrer")
            }
          >
            View Template
          </button>
        </div>
        <div className="flex flex-col gap-2 items-center">
          <input
            type="file"
            accept=".csv"
            id="csv-upload"
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors cursor-pointer w-full"
            onChange={handleFileChange}
            disabled={fileUploadDisabled}
          />
          {fileUploadDisabled && (
            <span className="text-red-600 text-sm mt-1">
              Please select a sport before uploading a file.
            </span>
          )}
          {fileName !== "" && (
            <span className="text-gray-700 text-sm mt-1">File: {fileName}</span>
          )}
          {error && <span className="text-red-600 text-sm mt-1">{error}</span>}
        </div>
        <button
          className={`px-4 py-2 rounded text-white font-semibold transition-colors w-full ${
            isValid
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={!isValid}
          onClick={handleUpload}
        >
          Upload
        </button>
      </div>
    </div>
  );
};

// export default withRoleProtectedRoute(UploadSchedulePage, ["admin", "dev"]);
export default UploadSchedulePage; // will switch to withRoleProtectedRoute after development
