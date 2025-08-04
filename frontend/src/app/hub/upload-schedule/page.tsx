"use client";

import PageHeading from "@src/components/PageHeading";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React from "react";

import { useState, ChangeEvent } from "react";
import { colleges, isValidTimestamp } from "@src/utils/helpers";

const TEMPLATE_URL =
  "https://docs.google.com/spreadsheets/d/1rmyTsJwoXkJ0MbGh6MjZXF0wfWnDlc8-bFTkHIRPVmQ/edit?usp=sharing";

const validCollegeAbbrs = colleges.map((c) => c.id);

const validateScheduleCSV = (csvText: string): boolean => {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return false;
  // Check header
  const header = lines[0].toLowerCase().replace(/\s+/g, "");
  if (
    !header.includes("timestamp") ||
    !header.includes("homecollege") ||
    !header.includes("awaycollege") ||
    !header.includes("location")
  ) {
    return false;
  }
  // Validate each row
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((v) => v.trim());
    if (row.length < 4) return false;
    const [timestamp, homeCollege, awayCollege, location] = row;
    if (!isValidTimestamp(timestamp)) return false;
    if (!validCollegeAbbrs.includes(homeCollege)) return false;
    if (!validCollegeAbbrs.includes(awayCollege)) return false;
    if (!location || location.length === 0) return false;
  }
  return true;
};

const UploadSchedulePage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState("");

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
      if (validateScheduleCSV(text)) {
        setFile(f);
        setFileName(f.name);
        setIsValid(true);
      } else {
        setError("Invalid CSV format. Please use the template.");
      }
    };
    reader.readAsText(f);
  };

  const handleUpload = () => {
    // Placeholder: implement upload logic here
    alert("Upload logic not implemented.");
  };

  return (
    <div className="min-h-screen pt-20 flex flex-col items-center">
      <PageHeading heading="Upload Schedule from CSV" />
      <div className="bg-white rounded shadow p-8 mt-8 w-full max-w-lg flex flex-col gap-6">
        <div className="flex flex-col gap-2 items-center">
          <a
            href={TEMPLATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors cursor-pointer text-blue-700 font-medium"
          >
            View Template
          </a>
        </div>
        <div className="flex flex-col gap-2 items-center">
          <label
            htmlFor="csv-upload"
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors cursor-pointer"
          >
            {fileName ? `File: ${fileName}` : "Choose CSV File"}
            <input
              type="file"
              accept=".csv"
              id="csv-upload"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
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

export default withRoleProtectedRoute(UploadSchedulePage, ["admin", "dev"]);
