"use client";

import React, { useState } from "react";
import BracketCreateModal from "@src/components/Admin/BracketCreateModal";
import BracketInterface from "@src/components/Admin/BracketInterface";
import { BracketData } from "@src/types/components";
import withProtectedRoute from "@src/components/withProtectedRoute";

const testData: BracketData = {
  sport: "Indoor Soccer",
  teams: [
    {
      college: "BF",
      seed: "1",
      division: "green",
      matchSlot: "1",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "BK",
      seed: "2",
      division: "green",
      matchSlot: "2",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "BF",
      seed: "3",
      division: "green",
      matchSlot: "2",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "DC",
      seed: "4",
      division: "green",
      matchSlot: "3",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "ES",
      seed: "5",
      division: "green",
      matchSlot: "3",
      matchDatetime: "2025-05-02T11:36",
      location: "PWG",
    },
    {
      college: "GH",
      seed: "6",
      division: "green",
      matchSlot: "4",
      matchDatetime: "2025-05-03T11:36",
      location: "PWG",
    },
    {
      college: "JE",
      seed: "7",
      division: "green",
      matchSlot: "4",
      matchDatetime: "2025-05-03T11:36",
      location: "PWG",
    },
    {
      college: "MC",
      seed: "1",
      division: "blue",
      matchSlot: "7",
      matchDatetime: "2025-05-02T11:36",
      location: "PWG",
    },
    {
      college: "MY",
      seed: "2",
      division: "blue",
      matchSlot: "8",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "PC",
      seed: "3",
      division: "blue",
      matchSlot: "8",
      matchDatetime: "2025-05-02T11:36",
      location: "PWG",
    },
    {
      college: "SY",
      seed: "4",
      division: "blue",
      matchSlot: "9",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "SM",
      seed: "5",
      division: "blue",
      matchSlot: "9",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "TD",
      seed: "6",
      division: "blue",
      matchSlot: "10",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "TC",
      seed: "7",
      division: "blue",
      matchSlot: "10",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "none",
      matchSlot: "5",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "none",
      matchSlot: "6",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "none",
      matchSlot: "11",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "none",
      matchSlot: "12",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "none",
      matchSlot: "13",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "none",
      matchSlot: "14",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "none",
      matchSlot: "15",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
  ],
};

const AdminBracketsPage: React.FC = () => {
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
            matchId: "playoff-11",
            homeScore: 10,
            awayScore: 20,
            homeForfeit: false,
            awayForfeit: false,
            homeTeam: "PC",
            awayTeam: "MC",
            sport: "Indoor Soccer",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to score match");
      }

      console.log("Success:", data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSave = async (bracketData: BracketData): Promise<void> => {
    // try {
    //   scoreTesting();
    // } catch (err) {
    //   console.error("Error:", err);
    // }

    // console.log("Bracket data to save:", bracketData);
    console.log("Bracket data to save:", testData);
    try {
      // call cloud function
      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/createBracket",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          // body: JSON.stringify(bracketData),
          body: JSON.stringify(testData),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create bracket");
      }
      console.log("Success:", data);
    } catch (error) {
      console.error("Error:", error);
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

      console.log("Success:", data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-8 text-center text-black-500">
        Admin Panel
      </h1>
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

export default withProtectedRoute(AdminBracketsPage);
