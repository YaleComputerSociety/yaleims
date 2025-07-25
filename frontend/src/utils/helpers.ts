// Define types for the sports
// Define types for the college map
type CollegeMap = Record<string, string>; // Map of abbreviation to full name
type SportMap = Record<string, number>;
type EmojiMap = Record<string, string>;

import { Match, Sport } from "@src/types/components";

export const colleges = [
  { id: "BF", name: "Benjamin Franklin" },
  { id: "BK", name: "Berkeley" },
  { id: "BR", name: "Branford" },
  { id: "DC", name: "Davenport" },
  { id: "ES", name: "Ezra Stiles" },
  { id: "GH", name: "Grace Hopper" },
  { id: "JE", name: "Jonathan Edwards" },
  { id: "MC", name: "Morse" },
  { id: "MY", name: "Pauli Murray" },
  { id: "PC", name: "Pierson" },
  { id: "SY", name: "Saybrook" },
  { id: "SM", name: "Silliman" },
  { id: "TD", name: "Timothy Dwight" },
  { id: "TC", name: "Trumbull" },
];

// List of sports with the proper type
export const sports: Sport[] = [
  {
    id: "15",
    name: "Indoor Soccer",
    points_for_win: 5,
    emoji: "⚽",
    season: { "2024-2025": "Spring" },
  },
  {
    id: "14",
    name: "Kanjam",
    points_for_win: 6,
    emoji: "🥏",
    season: { "2024-2025": "Spring" },
  },
  {
    id: "12",
    name: "Volleyball",
    points_for_win: 6,
    emoji: "🏐",
    season: { "2024-2025": "Spring" },
  },
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
    emoji: "💥",
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
  {
    id: "7",
    name: "Broomball",
    points_for_win: 6,
    emoji: "🧹",
    season: { "2024-2025": "Winter" },
  },
  {
    id: "8",
    name: "CHoops",
    points_for_win: 5,
    emoji: "🏀",
    season: { "2024-2025": "Winter" },
  },
  {
    id: "9",
    name: "MHoops",
    points_for_win: 5,
    emoji: "🏀",
    season: { "2024-2025": "Winter" },
  },
  {
    id: "10",
    name: "WHoops",
    points_for_win: 5,
    emoji: "🏀",
    season: { "2024-2025": "Winter" },
  },
  {
    id: "11",
    name: "Dodgeball",
    points_for_win: 8,
    emoji: "🤾‍♂️",
    season: { "2024-2025": "Winter" },
  },
  {
    id: "13",
    name: "Netball",
    points_for_win: 7,
    emoji: "🥅",
    season: { "2024-2025": "Spring" },
  },
];

export const totalOddsCalc = (bets: { betOdds: number }[]): number =>
  bets.reduce((prod, { betOdds }) => prod * betOdds, 1);

export const sportsMap: SportMap = {
  "Flag Football": 6,
  Spikeball: 6,
  Cornhole: 6,
  Pickleball: 6,
  "Table Tennis": 8,
  Soccer: 11,
  MHoops: 5,
  WHoops: 5,
  CHoops: 5,
  Dodgeball: 8,
  Broomball: 6,
  Kanjam: 6,
  "Indoor Soccer": 5,
  Volleyball: 6,
  Netball: 7,
};

export const emojiMap: EmojiMap = {
  "Flag Football": "🏈",
  Spikeball: "💥",
  Cornhole: "🌽",
  Pickleball: "🥒",
  "Table Tennis": "🏓",
  Soccer: "⚽",
  Broomball: "🧹",
  MHoops: "🏀",
  CHoops: "🏀",
  WHoops: "🏀",
  Dodgeball: "🤾‍♂️",
  "Indoor Soccer": "⚽",
  Volleyball: "🏐",
  Netball: "🥅",
  Kanjam: "🥏",
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

  // Filter out null matches
  const validMatches = allMatches.filter((item) => item !== null);

  validMatches.forEach((item) => {
    const date: string = new Date(item.timestamp).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    if (!groupedData[date]) {
      groupedData[date] = [];
    }
    groupedData[date].push(item);
  });

  return groupedData;
};

function formatDateTime(date: Date | string): string {
  const validDate = date instanceof Date ? date : new Date(date);

  if (isNaN(validDate.getTime())) {
    throw new Error("Invalid date format. Ensure 'start' is a valid date.");
  }

  const isoString = validDate.toISOString();
  return isoString.replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function generateGoogleCalendarLink(match: Match): string {
  const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";

  const start = new Date(match.timestamp);
  const end = new Date(start);
  end.setHours(start.getHours() + 1); // 1 hour long event

  const params = new URLSearchParams({
    text: `IM ${match.sport}: ${match.home_college} vs. ${match.away_college}`,
    details: `Intramural ${match.sport} match between ${
      toCollegeName[match.home_college]
    } and ${toCollegeName[match.away_college]}.`,
    location: `${match.location}${
      match.location_extra ? " " + match.location_extra : ""
    }`,
    dates: formatDateTime(start) + "/" + formatDateTime(end),
  });

  return `${baseUrl}&${params.toString()}`;
}

// export const groupBetByDate = (allBets: any[]) => {
//   const groupedData: { [key: string]: any[] } = {};

//   allBets.forEach((item) => {
//     const date: string = new Date(item.matchTimestamp).toLocaleDateString(
//       "en-CA",
//       {
//         year: "numeric",
//         month: "2-digit",
//         day: "2-digit",
//       }
//     );
//     if (!groupedData[date]) {
//       groupedData[date] = [];
//     }
//     groupedData[date].push(item);
//   });

//   return groupedData;
// };

export const groupBetByDate = (allBets: any[]) => {
  const groupedData: { [key: string]: any[] } = {};

  allBets.forEach((item) => {
    const timestamp = new Date(item.matchTimestamp);

    // Convert to EST (UTC-5) — adjust based on daylight saving time if needed
    const estTimestamp = new Date(
      timestamp.getTime() - 5 * 60 * 60 * 1000 // Subtract 5 hours
    );

    // Format to a date string in EST
    const date = estTimestamp.toISOString().split("T")[0];
    if (!groupedData[date]) {
      groupedData[date] = [];
    }
    groupedData[date].push(item);
  });

  return groupedData;
};

export const allTimeStandings = [
  ["Timothy Dwight", 14],
  ["Pierson", 11],
  ["Ezra Stiles", 10],
  ["Saybrook", 9],
  ["Berkeley", 8],
  ["Grace Hopper", 8],
  ["Silliman", 8],
  ["Davenport", 6],
  ["Jonathan Edwards", 5],
  ["Morse", 3],
  ["Pauli Murray", 3],
  ["Trumbull", 3],
  ["Branford", 2],
  ["Benjamin Franklin", 0],
];

export const isValidEmail = (input: string) => {
  // Accepts emails like first.last@school.edu
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input);
};
