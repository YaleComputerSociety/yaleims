"use client";

import React, { useState } from "react";
import BracketCreateModal from "@src/components/Admin/BracketCreateModal";
import BracketInterface from "@src/components/Admin/BracketInterface";
import { BracketData } from "@src/types/components";
// import withProtectedRoute from "@src/components/withProtectedRoute";

const testData: BracketData = {
  sport: "test!",
  teams: [
    {
      college: "Benjamin Franklin",
      seed: "1",
      division: "green",
      matchSlot: "1",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "Berkeley",
      seed: "2",
      division: "green",
      matchSlot: "2",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "Branford",
      seed: "3",
      division: "green",
      matchSlot: "2",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "Davenport",
      seed: "4",
      division: "green",
      matchSlot: "3",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "Ezra Stiles",
      seed: "5",
      division: "green",
      matchSlot: "3",
      matchDatetime: "2025-05-02T11:36",
      location: "PWG",
    },
    {
      college: "Grace Hopper",
      seed: "6",
      division: "green",
      matchSlot: "4",
      matchDatetime: "2025-05-03T11:36",
      location: "PWG",
    },
    {
      college: "Jonathan Edwards",
      seed: "7",
      division: "green",
      matchSlot: "4",
      matchDatetime: "2025-05-03T11:36",
      location: "PWG",
    },
    {
      college: "Morse",
      seed: "1",
      division: "blue",
      matchSlot: "7",
      matchDatetime: "2025-05-02T11:36",
      location: "PWG",
    },
    {
      college: "Pauli Murray",
      seed: "2",
      division: "blue",
      matchSlot: "8",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "Pierson",
      seed: "3",
      division: "blue",
      matchSlot: "8",
      matchDatetime: "2025-05-02T11:36",
      location: "PWG",
    },
    {
      college: "Saybrook",
      seed: "4",
      division: "blue",
      matchSlot: "9",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "Silliman",
      seed: "5",
      division: "blue",
      matchSlot: "9",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "Timothy Dwight",
      seed: "6",
      division: "blue",
      matchSlot: "10",
      matchDatetime: "2025-05-13T11:36",
      location: "PWG",
    },
    {
      college: "Trumbull",
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

  const handleSave = async (bracketData: BracketData): Promise<void> => {
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BracketInterface openModal={openModal} />

      <BracketCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        sport={selectedSport}
      />
    </div>
  );
};

// make it with protected route -> but CAS login is not working so unsure what to do
export default AdminBracketsPage;
