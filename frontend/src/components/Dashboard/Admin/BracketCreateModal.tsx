import {
  BracketModalProps,
  ParsedMatch,
  BracketData,
} from "@src/types/components";
import React, { useState, useEffect, ChangeEvent } from "react";
import {
  collegeNamesList,
  toCollegeAbbreviation,
  toCollegeName,
  validateBracketData,
  currentYear,
  parseBracketCSV,
  toTimestamp,
} from "@src/utils/helpers";
import { toast } from "react-toastify";
import { useSeason } from "@src/context/SeasonContext";

const matchesInit: ParsedMatch[] = Array.from({ length: 15 }, (_, i) => ({
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
  division: i <= 5 || i == 12 ? "blue" : i == 14 ? "final" : "green",
}));

const BracketModal: React.FC<BracketModalProps> = ({
  isOpen,
  onClose,
  onSave,
  sport,
}) => {
  const [parsedMatches, setParsedMatches] =
    useState<ParsedMatch[]>(matchesInit);
  const [overrideValidation, setOverrideValidation] = useState(false);
  const { currentSeason, seasonLoading } = useSeason();
  const year = currentSeason?.year || currentYear;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setParsedMatches(matchesInit);
    }
  }, [isOpen]);

  const handleChange = (
    index: number,
    field: keyof ParsedMatch,
    value: string
  ) => {
    // Fields that should be numbers
    const numberFields: (keyof ParsedMatch)[] = [
      "match_slot",
      "away_seed",
      "home_seed",
    ];
    const updatedMatches = [...parsedMatches];
    updatedMatches[index] = {
      ...updatedMatches[index],
      [field]: numberFields.includes(field) ? Number(value) : value,
    };
    setParsedMatches(updatedMatches);
  };

  const updateTimestamps = () => {
    const updatedMatches = parsedMatches.map((match) => {
      if (match.date && match.time) {
        const timestamp = toTimestamp(match.date, match.time, year);
        if (timestamp !== null) {
          return { ...match, timestamp: timestamp };
        }
      }
      return match;
    });

    setParsedMatches(updatedMatches);
  };

  const handleSubmit = () => {
    updateTimestamps();

    const bracketData: BracketData = {
      sport,
      matches: parsedMatches,
    };

    if (!overrideValidation && !validateBracketData(bracketData)) {
      return;
    }

    onSave(bracketData);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const csvText = e.target?.result as string;
        if (!csvText) return;
        const season = currentYear; // Replace with correct season if needed
        const matches = parseBracketCSV(csvText, season);
        console.log("Parsed matches from CSV:", matches);
        setParsedMatches(matches);
        toast.success("CSV file uploaded!");
      } catch (err: any) {
        toast.error(
          err.message || "Error parsing CSV file. Please check the format."
        );
      } finally {
        // Reset file input
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen || seasonLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-2/3 max-w-5xl max-h-[80vh] overflow-y-auto shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            Configure {sport} Playoff Bracket
          </h2>
          <button
            className="text-2xl bg-transparent border-0 cursor-pointer"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Match Slot
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Away College
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Away Seed
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Home College
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Home Seed
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Date
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Time
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Location
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Location Extra
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Division
                </th>
              </tr>
            </thead>
            <tbody>
              {parsedMatches.map((match, index) => (
                <tr
                  key={index}
                  className={`${
                    match.division === "green"
                      ? "bg-green-50"
                      : match.division === "blue"
                      ? "bg-blue-50"
                      : "bg-gray-50"
                  }`}
                >
                  <td className="border border-gray-300 p-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded"
                      type="number"
                      value={match.match_slot}
                      min="1"
                      max="15"
                      onChange={(e) =>
                        handleChange(index, "match_slot", e.target.value)
                      }
                      placeholder="1-15"
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <select
                      className="w-full p-2 border border-gray-300 rounded"
                      value={toCollegeName[match.away_college]}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "away_college",
                          toCollegeAbbreviation[e.target.value]
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
                  <td className="border border-gray-300 p-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded"
                      type="number"
                      value={match.away_seed}
                      min="1"
                      max="7"
                      onChange={(e) =>
                        handleChange(index, "away_seed", e.target.value)
                      }
                      placeholder="1-7"
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <select
                      className="w-full p-2 border border-gray-300 rounded"
                      value={toCollegeName[match.home_college]}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "home_college",
                          toCollegeAbbreviation[e.target.value] // see if this causes any problems
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
                  <td className="border border-gray-300 p-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded"
                      type="number"
                      value={match.home_seed}
                      min="1"
                      max="7"
                      onChange={(e) =>
                        handleChange(index, "home_seed", e.target.value)
                      }
                      placeholder="1-7"
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded"
                      type="text"
                      value={match.date}
                      onChange={(e) =>
                        handleChange(index, "date", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded"
                      type="text"
                      value={match.time}
                      onChange={(e) =>
                        handleChange(index, "time", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded"
                      type="text"
                      value={match.location}
                      onChange={(e) =>
                        handleChange(index, "location", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded"
                      type="text"
                      value={match.location_extra}
                      onChange={(e) =>
                        handleChange(index, "location_extra", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <select
                      className="w-full p-2 border border-gray-300 rounded"
                      value={match.division}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "division",
                          e.target.value as "green" | "blue" | "final"
                        )
                      }
                    >
                      <option value="green">Green</option>
                      <option value="blue">Blue</option>
                      <option value="final">Final</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* CSV Upload */}
          <div className="p-4 border border-dashed border-gray-300 rounded text-center mt-6">
            <h3 className="text-lg font-medium mb-2">Or upload CSV</h3>
            <div className="flex justify-center gap-4 mt-3">
              <a
                href="https://docs.google.com/spreadsheets/d/1D0Bx1oYOOAgQJF4-qDzcKdQYsWmbPfR3-xyAbrI1h4Q/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors cursor-pointer"
              >
                View Template
              </a>
              <label
                htmlFor="csv-upload"
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Choose CSV File
                <input
                  type="file"
                  accept=".csv"
                  id="csv-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
          <div className="flex justify-end mb-2">
            <label className="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overrideValidation}
                onChange={() => setOverrideValidation((v) => !v)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">
                Override input validation
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Create Bracket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BracketModal;
