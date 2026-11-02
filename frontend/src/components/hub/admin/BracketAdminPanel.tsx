"use client";

import React, { useState } from "react";
import BracketCreateModal from "@/components/hub/admin/BracketCreateModal";
import BracketInterface from "@/components/hub/admin/BracketInterface";
import { useSeason } from "@/context/SeasonContext";
import { createBracket, deleteBracket, slotsFromForm } from "@/lib/api/brackets";
import { ApiError } from "@/lib/api/core";
import { bracketIdOf, playoffsName } from "@/lib/brackets";
import type { BracketUpload } from "@/types/api";
import { toast } from "react-toastify";

/** Create and delete the current season's playoff brackets (admins and devs). */
const BracketAdminPanel: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [createBracketLoading, setCreateBracketLoading] =
    useState<boolean>(false);
  const { currentSeason } = useSeason();

  const openModal = (sport: string): void => {
    setSelectedSport(sport);
    setIsModalOpen(true);
  };

  // The form names the sport; the API takes its id.
  const handleSave = async (bracketData: BracketUpload): Promise<void> => {
    const sport = currentSeason?.sports.find((s) => s.name === bracketData.sport);
    if (!currentSeason || !sport) return;
    try {
      setCreateBracketLoading(true);
      await createBracket(currentSeason.id, {
        kind: "playoffs",
        sportId: sport.id,
        slots: slotsFromForm(bracketData.matches),
      });
      toast.success(
        `Bracket for sport '${bracketData.sport}' created successfully!`
      );
      setIsModalOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setCreateBracketLoading(false);
    }
  };

  const handleDeleteBracket = async (
    sport: string,
    setDeleteLoading: React.Dispatch<React.SetStateAction<boolean>>,
    force = false
  ) => {
    if (!currentSeason) return;
    setDeleteLoading(true);
    try {
      await deleteBracket(currentSeason.id, bracketIdOf(playoffsName(sport)), force);
      toast.success(`Successfully deleted bracket for sport '${sport}'`);
    } catch (error) {
      // Deleting takes back the points of scored games; the admin confirms that.
      if (error instanceof ApiError && error.code === "conflict" && !force) {
        if (window.confirm(`${error.message}\n\nDelete anyway?`)) {
          await handleDeleteBracket(sport, setDeleteLoading, true);
        }
        return;
      }
      toast.error((error as Error).message);
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
