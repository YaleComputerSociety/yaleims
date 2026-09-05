import React from "react";
import { currentYear, sports } from "@src/utils/helpers";
import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { useSeason } from "@src/context/SeasonContext";

interface BracketInterfaceProps {
  openModal: (sport: string) => void;
  handleDeleteBracket: (
    sport: string,
    setDeleteLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => Promise<void>;
}

const selectClasses =
  "p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 " +
  "text-gray-900 dark:text-gray-100 w-full sm:w-64 focus:outline-none focus:ring-2";

const BracketInterface: React.FC<BracketInterfaceProps> = ({
  openModal,
  handleDeleteBracket,
}) => {
  const [createSport, setCreateSport] = useState<string>("");
  const [deleteSport, setDeleteSport] = useState<string>("");
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const { currentSeason, seasonLoading } = useSeason();
  const season = currentSeason?.year || currentYear;

  const handleCreateChange = (sport: string) => {
    setCreateSport(sport);
  };

  const handleDeleteChange = (sport: string) => {
    setDeleteSport(sport);
    setConfirmingDelete(false);
  };

  const handleCreateClick = () => {
    openModal(createSport);
    setCreateSport("");
  };

  const handleDeleteClick = async () => {
    await handleDeleteBracket(deleteSport, setDeleteLoading);
    setDeleteSport("");
    setConfirmingDelete(false);
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-2xl mx-auto p-5 sm:p-8 rounded-xl shadow-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 text-center text-blue-900 dark:text-blue-200">
          Playoff Brackets Administration
        </h1>
        {/* There is no season picker: both actions always target the current
            season, so it is spelled out rather than assumed. */}
        <p className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {seasonLoading ? "Loading season…" : `${season} season`}
          </span>
        </p>

        <div className="mb-10">
          <h2 className="text-lg sm:text-xl font-semibold mb-1 text-blue-800 dark:text-blue-300">
            Create Bracket
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Pick a sport to open the bracket editor, where you can fill in the 15
            playoff match slots by hand or from a CSV. The bracket is added to the
            {" "}{season} season.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              className={`${selectClasses} focus:ring-blue-400`}
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
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              }`}
            >
              Create
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold mb-1 text-red-600 dark:text-red-400">
            Delete Bracket &amp; Playoff Matches
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Removes the sport&apos;s bracket and every playoff match that belongs
            to it, in the {season} season. This cannot be undone.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              className={`${selectClasses} focus:ring-red-400`}
              value={deleteSport}
              onChange={(e) => handleDeleteChange(e.target.value)}
              disabled={deleteLoading}
            >
              <option value="">Select Sport</option>
              {sports.map((sport) => (
                <option key={sport.name} value={sport.name}>
                  {sport.emoji} {sport.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setConfirmingDelete(true)}
              disabled={!deleteSport || confirmingDelete || deleteLoading}
              className={`w-full sm:w-auto px-5 py-2 rounded font-semibold transition-colors ${
                deleteSport && !confirmingDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              }`}
            >
              Delete
            </button>
          </div>

          {/* Deleting a bracket wipes its playoff matches, so it takes a
              second, explicit confirmation naming the sport. */}
          {confirmingDelete && deleteSport && (
            <div className="mt-4 p-4 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                Delete the <strong>{deleteSport}</strong> bracket and all of its
                playoff matches from the <strong>{season}</strong> season?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteClick}
                  disabled={deleteLoading}
                  className="px-4 py-2 rounded font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <FaSpinner className="animate-spin" /> Deleting…
                    </>
                  ) : (
                    `Yes, delete ${deleteSport}`
                  )}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleteLoading}
                  className="px-4 py-2 rounded font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BracketInterface;
