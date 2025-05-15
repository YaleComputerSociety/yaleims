import { Team, BracketModalProps } from "@src/types/components";
import React, { useState, useEffect, ChangeEvent } from "react";
import { collegeNamesList } from "@src/utils/helpers";

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
    onSave({
      sport,
      teams,
    });
    onClose();
  };

  // Handle CSV file upload
  // const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;

  //   const reader = new FileReader();
  //   reader.onload = (e: ProgressEvent<FileReader>) => {
  //     const csvText = e.target?.result as string;
  //     if (!csvText) return;

  //     const lines = csvText.split("\n");

  //     // Skip header if present
  //     const startLine = lines[0].includes("College") ? 1 : 0;

  //     const newTeams: Team[] = [];

  //     for (let i = startLine; i < lines.length && newTeams.length < 8; i++) {
  //       if (!lines[i].trim()) continue;

  //       const values = lines[i].split(",");
  //       if (values.length >= 5) {
  //         const division = values[2].trim().toLowerCase();

  //         newTeams.push({
  //           college: values[0].trim(),
  //           seed: values[1].trim(),
  //           division: division === "blue" ? "blue" : "green",
  //           matchSlot: values[3].trim(),
  //           matchDatetime: values[4].trim(),
  //         });
  //       }
  //     }

  //     if (newTeams.length > 0) {
  //       setTeams(newTeams);
  //     }
  //   };

  //   reader.readAsText(file);
  // };

  // const downloadTemplate = () => {
  //   // Create CSV content with template and example data
  //   const csvContent = `College,Seed,Division,MatchSlot,MatchDatetime
  // Berkeley,1,Green,2,2025-05-15T19:00
  // Stanford,2,Blue,10,2025-05-15T20:30
  // Harvard,3,Green,3,2025-05-16T18:00
  // Yale,4,Blue,9,2025-05-16T19:30
  // Princeton,5,Green,4,2025-05-17T17:00
  // Columbia,6,Blue,8,2025-05-17T18:30
  // Cornell,7,Green,1,2025-05-18T17:00
  // Brown,8,Blue,7,2025-05-18T18:30`;

  //   // Create a Blob with the CSV content
  //   const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  //   // Create a download link
  //   const link = document.createElement("a");
  //   const url = URL.createObjectURL(blob);

  //   link.setAttribute("href", url);
  //   link.setAttribute("download", "bracket_template.csv");
  //   link.style.visibility = "hidden";

  //   // Add to DOM, trigger download, and clean up
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-11/12 max-w-5xl max-h-[90vh] overflow-y-auto shadow-lg">
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
                        handleChange(index, "college", e.target.value)
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
          {/* <div className="p-4 border border-dashed border-gray-300 rounded text-center mt-6">
            <h3 className="text-lg font-medium mb-2">Or upload CSV</h3>
            <div className="flex justify-center gap-4 mt-3">
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
              >
                Download Template
              </button>
              <input
                type="file"
                accept=".csv"
                id="csv-upload"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => document.getElementById("csv-upload")?.click()}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
              >
                Choose CSV File
              </button>
            </div>
          </div> */}
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
