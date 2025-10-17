// Helper to parse and validate bracket CSV for BracketCreateModal
import { ParsedMatch } from "@src/types/components";

/**
 * Parses and validates a bracket CSV file for the bracket creation modal.
 * Returns an array of ParsedMatch or throws an error with a user-friendly message.
 * Expects columns: matchSlot,awayCollege,awaySeed,homeCollege,homeSeed,location,locationExtra,date,time,division
 */
export function parseBracketCSV(
  csvText: string,
  season: string
): ParsedMatch[] {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV must have at least one data row.");
  // Check header
  const header = lines[0].toLowerCase().replace(/\s+/g, "");
  const expectedColumns = [
    "matchslot",
    "awaycollege",
    "awayseed",
    "homecollege",
    "homeseed",
    "date",
    "time",
    "location",
    "locationextra",
    "division",
  ];
  const hasHeader = expectedColumns.every((col) => header.includes(col));
  const startLine = hasHeader ? 1 : 0;
  const validCollegeAbbrs = colleges.map((c) => c.id);
  const matches: ParsedMatch[] = [];
  for (let i = startLine; i < lines.length; i++) {
    const row = lines[i].split(",").map((v) => v.trim());
    const rowNum = i + 1;
    if (row.length < 10) {
      throw new Error(`Row ${rowNum}: Not enough columns (expected 10).`);
    }
    if (row.length > 10) {
      throw new Error(`Row ${rowNum}: Too many columns (expected 10).`);
    }
    const [
      matchSlot,
      awayCollege,
      awaySeed,
      homeCollege,
      homeSeed,
      date,
      time,
      location,
      locationExtra,
      division,
    ] = row;
    // Validate match slot
    const match_slot = Number(matchSlot);
    if (isNaN(match_slot) || match_slot < 1 || match_slot > 15) {
      throw new Error(`Row ${rowNum}: Invalid match slot (must be 1-15).`);
    }
    // Validate college abbreviations (allow TBD)
    const away_college = awayCollege || "TBD";
    const home_college = homeCollege || "TBD";
    if (away_college !== "TBD" && !validCollegeAbbrs.includes(away_college)) {
      throw new Error(
        `Row ${rowNum}: Invalid away college abbreviation: '${away_college}'.`
      );
    }
    if (home_college !== "TBD" && !validCollegeAbbrs.includes(home_college)) {
      throw new Error(
        `Row ${rowNum}: Invalid home college abbreviation: '${home_college}'.`
      );
    }
    // Seeds
    const away_seed = awaySeed ? Number(awaySeed) : -1;
    const home_seed = homeSeed ? Number(homeSeed) : -1;
    if (away_seed !== -1 && (away_seed < 1 || away_seed > 7)) {
      throw new Error(
        `Row ${rowNum}: Invalid away seed (must be 1-7 or blank for -1).`
      );
    }
    if (home_seed !== -1 && (home_seed < 1 || home_seed > 7)) {
      throw new Error(
        `Row ${rowNum}: Invalid home seed (must be 1-7 or blank for -1).`
      );
    }
    // Location
    if (!location || location.length === 0) {
      throw new Error(`Row ${rowNum}: Missing location.`);
    }
    // Date/time
    const dateRegex = /^\d{1,2}\/\d{1,2}$/;
    if (!dateRegex.test(date)) {
      throw new Error(
        `Row ${rowNum}: Invalid date format (expected M/D or MM/DD).`
      );
    }
    const timeRegex = /^\d{1,2}:\d{2}\s?(AM|PM)$/i;
    if (!timeRegex.test(time)) {
      throw new Error(
        `Row ${rowNum}: Invalid time format (expected H:MM AM/PM).`
      );
    }
    const timestamp = toTimestamp(date, time, season);
    if (!timestamp || isNaN(new Date(timestamp).getTime())) {
      throw new Error(`Row ${rowNum}: Invalid date/time combination.`);
    }
    // Division
    const div = division.toLowerCase();
    if (!["blue", "green", "final"].includes(div)) {
      throw new Error(
        `Row ${rowNum}: Invalid division (must be blue, green, or final).`
      );
    }
    const match: ParsedMatch = {
      match_slot,
      away_college,
      away_seed,
      home_college,
      home_seed,
      location,
      ...(locationExtra && locationExtra.trim() !== ""
        ? { location_extra: locationExtra }
        : {}),
      timestamp,
      division: div,
      date,
      time,
    };
    matches.push(match);
  }
  return matches;
}
// Define types for the sports
// Define types for the college map
type CollegeMap = Record<string, string>; // Map of abbreviation to full name
type SportMap = Record<string, number>;
type EmojiMap = Record<string, string>;
type SeasonSportsMap = { [x: string]: string[] };

import { BracketData, Match, Sport } from "@src/types/components";
import { toast } from "react-toastify";

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

export const collegeNamesList = [
  "Benjamin Franklin",
  "Berkeley",
  "Branford",
  "Davenport",
  "Ezra Stiles",
  "Grace Hopper",
  "Jonathan Edwards",
  "Morse",
  "Pauli Murray",
  "Pierson",
  "Saybrook",
  "Silliman",
  "Timothy Dwight",
  "Trumbull",
];

export const seasonStart = new Date("2025-09-08T00:00:00Z");

export function getCurrentWeekId(seasonStart: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - seasonStart.getTime();
  const weekNumber = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `week_${weekNumber}`;
}

const msPerWeek = 7 * 24 * 60 * 60 * 1000;

export function buildWeekOptions(
  start: Date
): { value: string; label: string }[] {
  const now = new Date();

  const firstWeekStart = new Date(start);
  const day = firstWeekStart.getDay(); // 0 = Sun … 6 = Sat
  if (day !== 1) {
    firstWeekStart.setDate(firstWeekStart.getDate() + ((8 - day) % 7));
  }

  const weekCount =
    Math.floor((now.getTime() - firstWeekStart.getTime()) / msPerWeek) + 1;

  const format = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

  const options = [];
  for (let i = 0; i < weekCount; i++) {
    const weekStart = new Date(firstWeekStart.getTime() + i * msPerWeek);
    const weekEnd = new Date(weekStart.getTime() + msPerWeek);
    options.push({
      value: `week_${i + 1}`,
      label: `Week ${i + 1}: ${format(weekStart)} – ${format(weekEnd)}`,
    });
  }
  return options.reverse();
}

export const seasonSports: SeasonSportsMap = {
  winter: ["Broomball", "CHoops", "MHoops", "WHoops", "Dodgeball"],
  spring: ["Indoor Soccer", "Kanjam", "Volleyball", "Netball"],
  fall: [
    "Soccer",
    "Flag Football",
    "Spikeball",
    "Cornhole",
    "Pickleball",
    "Table Tennis",
  ],
};

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
  "": "",
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

// Fallback if year context fails
export const currentYear = getYearFromTimestamp(new Date());

export const validateBracketData = (bracketData: BracketData): boolean => {
  const matches = bracketData.matches;
  let isValid = true;
  const collegeAbbrs = colleges.map((c) => c.id);

  const matchSlots = matches.map((m) => m.match_slot);
  // 1. All match slots 1-15 must be present
  for (let i = 1; i <= 15; i++) {
    if (!matchSlots.includes(i)) {
      toast.error(`Missing match slot ${i}`, { autoClose: 7000 });
      isValid = false;
    }
  }

  // 2. Bye slots (1 and 7) must have same college in home and away, both seeds 1
  [1, 7].forEach((slot) => {
    const m = matches.find((m) => m.match_slot === slot);
    if (!m) {
      toast.error(`Missing bye match slot ${slot}`, { autoClose: 7000 });
      isValid = false;
      return;
    }
    if (
      !m.away_college ||
      !m.home_college ||
      m.away_college !== m.home_college ||
      m.away_seed !== 1 ||
      m.home_seed !== 1
    ) {
      toast.error(
        `Bye match slot ${slot} must have the same college for home and away, and both seeds must be 1.`,
        { autoClose: 7000 }
      );
      isValid = false;
    }
  });

  // 3. All colleges must be present only once (except byes in slots 1 and 7), and must be valid
  const collegeCount: Record<string, number> = {};
  matches.forEach((m, idx) => {
    // Validate away_college
    if (m.away_college && m.away_college !== "TBD") {
      if (!collegeAbbrs.includes(m.away_college)) {
        toast.error(
          `Invalid away college in row ${idx + 1}: ${m.away_college}`,
          { autoClose: 7000 }
        );
        isValid = false;
      }
    }
    // Validate home_college
    if (m.home_college && m.home_college !== "TBD") {
      if (!collegeAbbrs.includes(m.home_college)) {
        toast.error(
          `Invalid home college in row ${idx + 1}: ${m.home_college}`,
          { autoClose: 7000 }
        );
        isValid = false;
      }
    }
    // skip byes for counting
    if (
      (m.match_slot === 1 || m.match_slot === 7) &&
      m.away_college === m.home_college
    ) {
      if (m.away_college && m.away_college !== "TBD") {
        collegeCount[m.away_college] = (collegeCount[m.away_college] || 0) + 1;
      }
      return;
    }
    if (m.away_college && m.away_college !== "TBD") {
      collegeCount[m.away_college] = (collegeCount[m.away_college] || 0) + 1;
    }
    if (m.home_college && m.home_college !== "TBD") {
      collegeCount[m.home_college] = (collegeCount[m.home_college] || 0) + 1;
    }
  });
  Object.entries(collegeCount).forEach(([college, count]) => {
    if (count > 1) {
      toast.error(
        `College ${college} appears ${count} times (should only appear once except byes)`,
        { autoClose: 7000 }
      );
      isValid = false;
    }
  });

  // Also check for missing colleges (should appear at least once, except TBD)
  collegeAbbrs.forEach((abbr) => {
    // Only check for missing if not present at all
    if (!collegeCount[abbr]) {
      toast.error(`College ${abbr} is missing from the bracket`, {
        autoClose: 7000,
      });
      isValid = false;
    }
  });

  // 4. Each seed 1-7 should only appear once per division (except 1 in byes, but byes should count toward presence)
  const divisionSeeds: Record<string, Record<number, number>> = {
    blue: {},
    green: {},
  };
  matches.forEach((m) => {
    if (m.division === "blue" || m.division === "green") {
      // For byes (slots 1 and 7), count both away_seed and home_seed if they are 1
      if (
        (m.match_slot === 1 || m.match_slot === 7) &&
        m.away_seed === 1 &&
        m.home_seed === 1
      ) {
        divisionSeeds[m.division][1] = (divisionSeeds[m.division][1] || 0) + 1;
        return;
      }
      [
        { seed: m.away_seed, college: m.away_college },
        { seed: m.home_seed, college: m.home_college },
      ].forEach(({ seed, college }) => {
        if (seed >= 1 && seed <= 7 && college && college !== "TBD") {
          divisionSeeds[m.division][seed] =
            (divisionSeeds[m.division][seed] || 0) + 1;
        }
      });
    }
  });
  ["blue", "green"].forEach((div) => {
    for (let s = 1; s <= 7; s++) {
      const count = divisionSeeds[div][s] || 0;
      if (count > 1) {
        toast.error(
          `Seed ${s} appears ${count} times in ${div} division (should only appear once except byes)`,
          { autoClose: 7000 }
        );
        isValid = false;
      }
      if (count === 0) {
        toast.error(`Seed ${s} missing from ${div} division`, {
          autoClose: 7000,
        });
        isValid = false;
      }
    }
  });

  // 5. All timestamps must be valid timestamps
  matches.forEach((m, idx) => {
    if (m.timestamp === "" || isNaN(Date.parse(m.timestamp))) {
      toast.error(`Invalid or missing timestamp in row ${idx + 1}`, {
        autoClose: 7000,
      });
      isValid = false;
    }
  });

  // 6. Location is some string (not empty)
  matches.forEach((m, idx) => {
    if (!m.location || m.location.trim() === "") {
      toast.error(`Missing location in row ${idx + 1}`, { autoClose: 7000 });
      isValid = false;
    }
  });

  // 7. 7 blue, 7 green, 1 final match
  const blue = matches.filter((m) => m.division === "blue").length;
  const green = matches.filter((m) => m.division === "green").length;
  const final = matches.filter((m) => m.division === "final").length;
  if (blue !== 7) {
    toast.error(`There must be 7 blue division matches (found ${blue})`, {
      autoClose: 7000,
    });
    isValid = false;
  }
  if (green !== 7) {
    toast.error(`There must be 7 green division matches (found ${green})`, {
      autoClose: 7000,
    });
    isValid = false;
  }
  if (final !== 1) {
    toast.error(`There must be 1 final match (found ${final})`, {
      autoClose: 7000,
    });
    isValid = false;
  }

  // 8. match slots 5,6,11-15 should have no selected colleges or TBD and seeds -1
  const TBDSlots = [5, 6, 11, 12, 13, 14, 15];
  TBDSlots.forEach((slot) => {
    const m = matches.find((m) => m.match_slot === slot);
    if (!m) return;
    const awayOk =
      (!m.away_college || m.away_college === "TBD") && m.away_seed === -1;
    const homeOk =
      (!m.home_college || m.home_college === "TBD") && m.home_seed === -1;
    if (!awayOk || !homeOk) {
      toast.error(
        `Match slot ${slot} should have no selected colleges (or 'TBD') and seeds -1`,
        { autoClose: 7000 }
      );
      isValid = false;
    }
  });

  return isValid;
};

// Validate timestamp format: YYYY-MM-DDTHH:MM
export const isValidFirestoreTimestamp = (s: string) => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && !isNaN(Date.parse(s));
};

/** normal timestamp -> ISO string timestamp
 * @param dateStr in M/D or MM/DD format
 * @param timeStr in H:MM AM/PM format
 * @param season in YYYY-YYYY format to determine the year
 * e.g. "1/23" + "7:30 PM" → ISO String timestamp **/
export const toTimestamp = (
  dateStr: string,
  timeStr: string,
  season: string
) => {
  if (!dateStr || !timeStr || !season) return null;

  const [mm, dd] = dateStr.split("/").map(Number);
  // Support both 'H:MM AM/PM' and 'H:MMAM/PM' (with or without space)
  let clock = "",
    part = "";
  const timeMatch = timeStr.match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);
  if (timeMatch) {
    clock = timeMatch[1];
    part = timeMatch[2];
  } else {
    [clock, part] = timeStr.split(" ");
  }
  let [hh, min] = clock.split(":").map(Number);
  if (part && part.toLowerCase() === "pm" && hh !== 12) hh += 12;
  if (part && part.toLowerCase() === "am" && hh === 12) hh = 0;

  // Determine year from season and month
  const [startYearStr, endYearStr] = season.split("-");
  const startYear = parseInt(startYearStr, 10);
  const endYear = parseInt(endYearStr, 10);
  let year: number;
  if (mm >= 1 && mm <= 5) {
    year = endYear; // Jan-May: use later year
  } else if (mm >= 8 && mm <= 12) {
    year = startYear; // Aug-Dec: use earlier year
  } else {
    // June/July: default to startYear (no games expected)
    year = startYear;
  }

  const dateObj = new Date(year, mm - 1, dd, hh, min, 0, 0);
  return dateObj.toISOString();
};

/** Returns the IM season string (e.g. "2024-2025") for a given timestamp */
export function getYearFromTimestamp(
  timestamp: Date | string | number
): string {
  let date: Date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "string" || typeof timestamp === "number") {
    date = new Date(timestamp);
  } else {
    throw new Error("Invalid timestamp type");
  }
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JS months are 0-based

  // Aug-Dec: season starts this year, ends next year
  if (month >= 8 && month <= 12) {
    return `${year}-${year + 1}`;
  }
  // Jan-May: season started previous year, ends this year
  if (month >= 1 && month <= 5) {
    return `${year - 1}-${year}`;
  }
  // June/July: default to previous season (no games expected)
  return `${year - 1}-${year}`;
}
