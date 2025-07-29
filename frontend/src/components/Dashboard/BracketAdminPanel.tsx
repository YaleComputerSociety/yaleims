"use client";

import React, { useState } from "react";
import BracketCreateModal from "@src/components/Dashboard/BracketCreateModal";
import BracketInterface from "@src/components/Dashboard/BracketInterface";
import { BracketData } from "@src/types/components";
import withProtectedRoute from "@src/components/withProtectedRoute";
import { toast } from "react-toastify";

const BracketAdminPanel: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSport, setSelectedSport] = useState<string>("");

  const openModal = (sport: string): void => {
    setSelectedSport(sport);
    setIsModalOpen(true);
  };

  const scoreTesting = async () => {
    try {
      // call cloud function
      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/scoreMatchTesting",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            matchId: "playoff-79",
            homeScore: 0,
            awayScore: 4,
            homeForfeit: false,
            awayForfeit: false,
            homeTeam: "BK",
            awayTeam: "ES",
            sport: "Volleyball",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to score match");
      }
    } catch (error) {
      toast.error(
        "Error: " + (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const handleSave = async (bracketData: BracketData): Promise<void> => {
    // try {
    //   scoreTesting();
    //   toast.success("scored test match");
    // } catch (err) {
    //   toast.error(
    //     "Error: " + (err instanceof Error ? err.message : "Unknown error")
    //   );
    // }

    try {
      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/createBracket",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify(bracketData),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create bracket");
      }
      toast.success(
        `Bracket for sport '${bracketData.sport}' created successfully!`
      );
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleDeleteBracket = async (
    sport: string,
    setDeleteLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setDeleteLoading(true);
    try {
      // call cloud function
      const dataToSend = { sport };

      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/deleteBracket",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify(dataToSend),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete bracket");
      }

      toast.success(`Successfully deleted bracket for sport '${sport}'`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BracketInterface
        openModal={openModal}
        handleDeleteBracket={handleDeleteBracket}
      />

      <BracketCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        sport={selectedSport}
      />
    </div>
  );
};

export default BracketAdminPanel;
