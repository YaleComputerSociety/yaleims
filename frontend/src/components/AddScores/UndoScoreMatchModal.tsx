import { useSeason } from "@src/context/SeasonContext";
import { currentYear } from "@src/utils/helpers";
import React from "react";
import LoadingScreen from "../LoadingScreen";
import { toast } from "react-toastify";
import { FaSpinner } from "react-icons/fa";

interface UndoScoreMatchModalProps {
  unscoreId: string;
  setShowConfirmation: (value: React.SetStateAction<boolean>) => void;
  setUnscoreMessage?: (value: React.SetStateAction<string | null>) => void;
  setUnscoreId?: (value: React.SetStateAction<string>) => void;
  setRefreshKey?: (value: React.SetStateAction<number>) => void;
}

const UndoScoreMatchModal: React.FC<UndoScoreMatchModalProps> = ({
  unscoreId,
  setShowConfirmation,
  setUnscoreMessage,
  setUnscoreId,
  setRefreshKey,
}) => {
  const [loading, setLoading] = React.useState<boolean>(false);
  const { currentSeason, seasonLoading } = useSeason();
  const year = currentSeason?.year || currentYear;

  const handleUnscoreMatch = async () => {
    setLoading(true);

    try {
      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch("/api/functions/undoScoreMatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ matchId: unscoreId, year }),
      });

      if (response.ok) {
        if (setUnscoreMessage)
          setUnscoreMessage("Successfully unscored the match.");
        else toast.success("Successfully unscored the match.");
        if (setUnscoreId) setUnscoreId(""); // Clear input after success
        if (setRefreshKey) setRefreshKey((k) => k + 1); // Trigger refetch
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error) {
      const errorMessage =
        (error as Error)?.message || "An error occurred. Please try again.";
      if (setUnscoreMessage) setUnscoreMessage(errorMessage);
      else toast.error(errorMessage);
      if (setUnscoreMessage)
        setUnscoreMessage("An error occurred. Please try again.");
      else toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
      setShowConfirmation(false); // Hide modal after processing
    }
  };

  if (seasonLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center">
        <h3 className="text-lg font-semibold mb-4">
          Are you sure you want to unscore this match?
        </h3>
        <p className="mb-6 text-gray-600">Match ID: {unscoreId}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setShowConfirmation(false)}
            className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleUnscoreMatch}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            {loading ? (
              <FaSpinner className="animate-spin text-lg mx-auto" />
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UndoScoreMatchModal;
