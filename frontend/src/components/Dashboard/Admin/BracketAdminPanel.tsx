"use client";

import React, { useState } from "react";
import BracketCreateModal from "@src/components/Dashboard/Admin/BracketCreateModal";
import BracketInterface from "@src/components/Dashboard/Admin/BracketInterface";
import { BracketData } from "@src/types/components";
import { toast } from "react-toastify";

const BracketAdminPanel: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [createBracketLoading, setCreateBracketLoading] =
    useState<boolean>(false);

  const openModal = (sport: string): void => {
    setSelectedSport(sport);
    setIsModalOpen(true);
  };

  const handleSave = async (bracketData: BracketData): Promise<void> => {
    try {
      setCreateBracketLoading(true);
      const response = await fetch("/api/functions/createBracket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bracketData }),
      });
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
    } finally {
      setCreateBracketLoading(false);
    }
  };

  const handleDeleteBracket = async (
    sport: string,
    setDeleteLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setDeleteLoading(true);
    try {
      const dataToSend = { sport };

      const response = await fetch("/api/functions/deleteBracket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

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
        loading={createBracketLoading}
      />
    </div>
  );
};

export default BracketAdminPanel;
