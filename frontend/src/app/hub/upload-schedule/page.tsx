"use client";

import PageHeading from "@/components/layout/PageHeading";
import withRoleProtectedRoute from "@/components/hub/withRoleProtectedRoute";
import React, { useEffect, useRef, useState, ChangeEvent } from "react";
import { toast } from "react-toastify";
import { useSeason, useSeasonDetail } from "@/context/SeasonContext";
import LoadingScreen from "@/components/layout/LoadingScreen";
import { FaSpinner } from "react-icons/fa";
import { uploadSchedule, type NewMatch } from "@/lib/api/matches";
import { parseScheduleCsv } from "@/lib/csv/schedule";

/** A parsed file: one sport's games for one season. */
interface Schedule {
  matches: NewMatch[];
  sportId: string;
  season: string;
}

const TEMPLATE_URL =
  "https://docs.google.com/spreadsheets/d/1rmyTsJwoXkJ0MbGh6MjZXF0wfWnDlc8-bFTkHIRPVmQ/edit?usp=sharing";

const UploadSchedulePage = () => {
  const { currentSeason, pastSeasonIds, seasonLoading } = useSeason();

  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  // The sport by id; the season is the current one until one is picked.
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [pickedSeason, setSeason] = useState<string | null>(null);
  const season = pickedSeason ?? currentSeason?.id ?? "";
  const sports = useSeasonDetail(season || null)?.sports ?? [];
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyCsv = (text: string, sportId: string, forSeason: string): boolean => {
    const sport = sports.find((s) => s.id === sportId)?.name ?? "";
    try {
      const matches = parseScheduleCsv(text, sport, forSeason);
      setIsValid(true);
      setSchedule({ matches, sportId, season: forSeason });
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      setIsValid(false);
      setSchedule(null);
      return false;
    }
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
      await uploadSchedule(schedule.season, { sportId: schedule.sportId, matches: schedule.matches });
      resetState();
      toast.success("Schedule uploaded successfully!");
    } catch (error) {
      toast.error((error as Error).message);
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
              <option key={sport.id} value={sport.id}>
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
            <option value={currentSeason?.id}>{currentSeason?.id}</option>
            {pastSeasonIds
              .filter((y) => y !== currentSeason?.id)
              .map((y) => (
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
