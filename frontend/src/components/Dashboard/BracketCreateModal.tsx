import {
  Team,
  BracketModalProps,
  ParsedMatch,
  BracketData,
} from "@src/types/components";
import React, { useState, useEffect, ChangeEvent } from "react";
import { collegeNamesList, toCollegeAbbreviation } from "@src/utils/helpers";
import { toast } from "react-toastify";

const teamsInit: Team[] = [
  {
    college: "",
    seed: "",
    division: "green",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "green",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "green",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "green",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "green",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "green",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "green",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "blue",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "blue",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "blue",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "blue",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "blue",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "blue",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
  {
    college: "",
    seed: "",
    division: "blue",
    matchSlot: "",
    matchDatetime: "",
    location: "",
  },
];

const BracketModal: React.FC<BracketModalProps> = ({
  isOpen,
  onClose,
  onSave,
  sport,
}) => {
  const [teams, setTeams] = useState<Team[]>(teamsInit);
  const [parsedMatches, setParsedMatches] = useState<ParsedMatch[]>([]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTeams(teamsInit);
    }
  }, [isOpen]);

  // Handle field changes
  const handleChange = (index: number, field: keyof Team, value: string) => {
    const updatedTeams = [...teams];
    updatedTeams[index] = {
      ...updatedTeams[index],
      [field]: value,
    };
    setTeams(updatedTeams);
  };

  // Handle form submission
  const handleSubmit = () => {
    const bracketData: BracketData = {
      sport,
      matches: parsedMatches,
    };

    onSave(bracketData);
  };

  // Handle CSV file upload for: matchSlot, awayCollege, awaySeed, homeCollege, homeSeed, location, timestamp, division
  // TODO: add rigid input validation here
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const csvText = e.target?.result as string;
        if (!csvText) return;

        const lines = csvText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.length === 0) return;
        // Remove header if present
        const header = lines[0].toLowerCase();
        const hasHeader =
          header.includes("matchslot") && header.includes("awaycollege");
        const startLine = hasHeader ? 1 : 0;

        const newParsedMatches: ParsedMatch[] = [];
        for (let i = startLine; i < lines.length; i++) {
          const values = lines[i].split(",");
          if (values.length < 8) continue;
          newParsedMatches.push({
            match_slot: Number(values[0].trim()),
            away_college: values[1].trim() || "TBD",
            away_seed: Number(values[2].trim()) || -1,
            home_college: values[3].trim() || "TBD",
            home_seed: Number(values[4].trim()) || -1,
            location: values[5].trim() || "TBD",
            timestamp: values[6].trim() || "TBD",
            division: values[7].trim().toLowerCase(),
          });
        }
        if (newParsedMatches.length > 0) {
          setParsedMatches(newParsedMatches);
        }
        toast.success("CSV file uploaded!");
      } catch (err) {
        toast.error("Error parsing CSV file. Please check the format.");
      } finally {
        // Reset file input so user can upload the same file again if needed
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

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
                  College
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Seed
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Division
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Match Slot
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Match Date/Time
                </th>
                <th className="border border-gray-300 bg-gray-100 p-2 text-left">
                  Match Location
                </th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr
                  key={index}
                  className={`${
                    team.division === "green" ? "bg-green-50" : "bg-blue-50"
                  }`}
                >
                  <td className="border border-gray-300 p-2">
                    <select
                      className="w-full p-2 border border-gray-300 rounded"
                      value={team.college}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "college",
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
                      value={team.seed}
                      min="1"
                      max="7"
                      onChange={(e) =>
                        handleChange(index, "seed", e.target.value)
                      }
                      placeholder="1-7"
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <select
                      className="w-full p-2 border border-gray-300 rounded"
                      value={team.division}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "division",
                          e.target.value as "green" | "blue"
                        )
                      }
                    >
                      <option value="green">Green</option>
                      <option value="blue">Blue</option>
                    </select>
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded"
                      type="number"
                      value={team.matchSlot}
                      min="1"
                      max="15"
                      onChange={(e) =>
                        handleChange(index, "matchSlot", e.target.value)
                      }
                      placeholder="1-15"
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded"
                      type="datetime-local"
                      value={team.matchDatetime}
                      onChange={(e) =>
                        handleChange(index, "matchDatetime", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded"
                      type="text"
                      value={team.location}
                      onChange={(e) =>
                        handleChange(index, "location", e.target.value)
                      }
                    />
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
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
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
  );
};

export default BracketModal;
