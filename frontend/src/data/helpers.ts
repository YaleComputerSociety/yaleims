// Define types for the sports
// Define types for the college map
type CollegeMap = Record<string, string>; // Map of abbreviation to full name
type SportMap = Record<string, number>;
type EmojiMap = Record<string, string>;

import { Match, Sport } from "@src/types/components";

// List of sports with the proper type
export const sports: Sport[] = [
  {
    id: "1",
    name: "Soccer",
    points_for_win: 11,
    emoji: "⚽",
    season: { "2024-2025": "Fall" },
  },
  {
    id: "2",
    name: "Flag Football",
    points_for_win: 6,
    emoji: "🏈",
    season: { "2024-2025": "Fall" },
  },
  {
    id: "3",
    name: "Spikeball",
    points_for_win: 6,
    emoji: "🤾",
    season: { "2024-2025": "Fall" },
  },
  {
    id: "4",
    name: "Cornhole",
    points_for_win: 6,
    emoji: "🌽",
    season: { "2024-2025": "Fall" },
  },
  {
    id: "5",
    name: "Pickleball",
    points_for_win: 6,
    emoji: "🥒",
    season: { "2024-2025": "Fall" },
  },
  {
    id: "6",
    name: "Table Tennis",
    points_for_win: 8,
    emoji: "🏓",
    season: { "2024-2025": "Fall" },
  },
];

export const sportsMap: SportMap = {
  "Flag Football": 6,
  Spikeball: 6,
  Cornhole: 6,
  Pickleball: 6,
  "Table Tennis": 8,
  Soccer: 11,
};

export const emojiMap: EmojiMap = {
  "Flag Football": "🏈",
  Spikeball: "🤾",
  Cornhole: "🌽",
  Pickleball: "🥒",
  "Table Tennis": "🏓",
  Soccer: "⚽",
};

// College abbreviations mapped to full college names (fixed keys)
export const toCollegeName: CollegeMap = {
  BF: "Benjamin Franklin",
  BK: "Berkeley",
  BR: "Branford", // Changed "BF" to "BC" to make it unique
  DC: "Davenport",
  ES: "Ezra Stiles",
  GH: "Grace Hopper",
  JE: "Jonathan Edwards",
  MC: "Morse",
  MY: "Pauli Murray",
  PC: "Pierson",
  SY: "Saybrook",
  SM: "Silliman",
  TD: "Timothy Dwight",
  TC: "Trumbull",
  "Benjamin Franklin": "Benjamin Franklin",
  Berkeley: "Berkeley",
  Branford: "Branford", // Changed "BF" to "BC" to make it unique
  Davenport: "Davenport",
  "Ezra Stiles": "Ezra Stiles",
  "Grace Hopper": "Grace Hopper",
  "Jonathan Edwards": "Jonathan Edwards",
  Morse: "Morse",
  "Pauli Murray": "Pauli Murray",
  Pierson: "Pierson",
  Saybrook: "Saybrook",
  Silliman: "Silliman",
  "Timothy Dwight": "Timothy Dwight",
  Trumbull: "Trumbull",
};

// College abbreviations mapped to full college names (fixed keys)
export const toCollegeAbbreviation: Record<string, string> = {
  "Benjamin Franklin": "BF",
  Berkeley: "BK",
  Branford: "BR",
  Davenport: "DC",
  "Ezra Stiles": "ES",
  "Grace Hopper": "GH",
  "Jonathan Edwards": "JE",
  Morse: "MC",
  "Pauli Murray": "MY",
  Pierson: "PC",
  Saybrook: "SY",
  Silliman: "SM",
  "Timothy Dwight": "TD",
  Trumbull: "TC",
};

export const getPlace = (number: number | undefined): string => {
  if (number === undefined) {
    return "";
  }

  const lastDigit = number % 10;
  const lastTwoDigits = number % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${number}th`;
  }

  switch (lastDigit) {
    case 1:
      return `${number}st`;
    case 2:
      return `${number}nd`;
    case 3:
      return `${number}rd`;
    default:
      return `${number}th`;
  }
};

export const getRatioAsString = (
  numerator: number | undefined,
  denominator: number | undefined
) => {
  if (numerator === undefined || denominator === undefined) {
    return "0%";
  }

  const ratio = (numerator / denominator) * 100;

  if (ratio == 0) {
    return "2%";
  }

  return `${ratio}%`;
};

export const groupByDate = (allMatches: Match[]) => {
  const groupedData: { [key: string]: Match[] } = {};

  allMatches.forEach((item) => {
    const date: string = new Date(item.timestamp).toLocaleDateString(
      "en-CA",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );
    // console.log(date)
    if (!groupedData[date]) {
      groupedData[date] = [];
    }
    groupedData[date].push(item);
  });

  return groupedData;
};