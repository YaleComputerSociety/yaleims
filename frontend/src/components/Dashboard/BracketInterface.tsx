import React from "react";
import { sports } from "@src/utils/helpers";
import { useState } from "react";
import { FaSpinner } from "react-icons/fa";

interface BracketInterfaceProps {
  openModal: (sport: string) => void;
  handleDeleteBracket: (
    sport: string,
    setDeleteLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => Promise<void>;
}

// add a loading state for delete button

const BracketInterface: React.FC<BracketInterfaceProps> = ({
  openModal,
  handleDeleteBracket,
}) => {
  const [createSport, setCreateSport] = useState<string>("");
  const [deleteSport, setDeleteSport] = useState<string>("");
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const handleCreateChange = (sport: string) => {
    setCreateSport(sport);
  };

  const handleDeleteChange = (sport: string) => {
    setDeleteSport(sport);
  };

  const handleCreateClick = () => {
    openModal(createSport);
    setCreateSport("");
  };

  const handleDeleteClick = async () => {
    await handleDeleteBracket(deleteSport, setDeleteLoading);
    setDeleteSport("");
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-2xl mx-auto p-5 sm:p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-8 text-center text-blue-900">
          Playoff Brackets Administration
        </h1>

        <div className="mb-10">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 text-blue-800">
            Create Bracket
          </h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <select
              className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 w-full sm:w-auto"
              value={createSport}
              onChange={(e) => handleCreateChange(e.target.value)}
            >
              <option value="">Select Sport</option>
              {sports.map((sport) => (
                <option key={sport.name} value={sport.name}>
                  {sport.emoji} {sport.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateClick}
              disabled={!createSport}
              className={`w-full sm:w-auto px-5 py-2 rounded font-semibold transition-colors ${
                createSport
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Create
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-3 text-red-500">
            Delete Bracket & Playoff Matches
          </h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <select
              className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-300 w-full sm:w-auto"
              value={deleteSport}
              onChange={(e) => handleDeleteChange(e.target.value)}
            >
              <option value="">Select Sport</option>
              {sports.map((sport) => (
                <option key={sport.name} value={sport.name}>
                  {sport.emoji} {sport.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleDeleteClick}
              disabled={!deleteSport}
              className={`w-full sm:w-auto px-5 py-2 rounded font-semibold transition-colors ${
                deleteSport
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {!deleteLoading ? (
                "Delete"
              ) : (
                <FaSpinner className="animate-spin" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BracketInterface;
