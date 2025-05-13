import React from "react";
import { sports } from "@src/utils/helpers";
import { BracketData } from "@src/types/components";

interface BracketInterfaceProps {
  openModal: (sport: string) => void;
}

const testData: BracketData = {
  sport: "ball",
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
      division: "",
      matchSlot: "5",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "",
      matchSlot: "6",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "",
      matchSlot: "11",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "",
      matchSlot: "12",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "",
      matchSlot: "13",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "",
      matchSlot: "14",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
    {
      college: "TBD",
      seed: "-1",
      division: "",
      matchSlot: "15",
      matchDatetime: "2025-05-15T11:36",
      location: "PWG",
    },
  ],
};

const BracketInterface: React.FC<BracketInterfaceProps> = ({ openModal }) => {
  const availableSports = sports;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Playoff Brackets Administration
      </h1>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">
          Select Sport to Create Bracket
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {availableSports.map((sport) => (
            <div
              key={sport.name}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              onClick={() => openModal(sport.name)}
            >
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full text-xl font-bold mb-2">
                {sport.emoji}
              </div>
              <div className="font-medium">{sport.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BracketInterface;
