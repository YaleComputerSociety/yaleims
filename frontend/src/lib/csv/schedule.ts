// The schedule upload's CSV (Hub → Upload Schedule): one sport's
// regular-season games for a season, from the Google Sheets template or a
// *_schedule_formatted.csv file. Columns are found by name, not position.
import type { NewMatch } from "../api/matches";
import { COLLEGES } from "../colleges";
import { csvLines, seasonDateTime, splitCsvLine } from "./rows";

const validCollegeAbbrs: string[] = COLLEGES.map((c) => c.id);

const normalizeHeader = (cell: string) =>
  cell.trim().replace(/^"|"$/g, "").toLowerCase().replace(/[\s_]/g, "");

// Accepted spellings per column, so both the Google Sheets template and the
// generated *_schedule_formatted.csv files can be uploaded as-is.
const COLUMN_ALIASES = {
  date: ["date"],
  time: ["time"],
  homeCollege: ["homecollege", "home"],
  awayCollege: ["awaycollege", "away"],
  location: ["location"],
  locationExtra: ["locationextra", "room"],
  sport: ["sport"],
};

/**
 * The games of a schedule CSV for the sport named `sport` in `season`.
 * Throws an Error whose message names the first problem (and its row).
 */
export function parseScheduleCsv(csvText: string, sport: string, season: string): NewMatch[] {
  const lines = csvLines(csvText);
  if (lines.length < 2) throw new Error("The file has no data rows.");

  const headerCells = splitCsvLine(lines[0]).map(normalizeHeader);
  const columnOf = (field: keyof typeof COLUMN_ALIASES) =>
    headerCells.findIndex((cell) => COLUMN_ALIASES[field].includes(cell));

  // Columns are located by name rather than position: files in the wild put
  // home before away and vice versa, and reading blind by index silently
  // imported every match backwards.
  const idx = {
    date: columnOf("date"),
    time: columnOf("time"),
    homeCollege: columnOf("homeCollege"),
    awayCollege: columnOf("awayCollege"),
    location: columnOf("location"),
    locationExtra: columnOf("locationExtra"),
    sport: columnOf("sport"),
  };

  const missing = (["date", "time", "homeCollege", "awayCollege", "location"] as const).filter(
    (field) => idx[field] === -1
  );
  if (missing.length > 0) {
    throw new Error(
      `Invalid CSV format. Missing column(s): ${missing.join(", ")}. ` +
        "Header must include: date, time, awayCollege, homeCollege, location."
    );
  }

  const matches: NewMatch[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvLine(lines[i]);
    const rowNum = i + 1; // 1-based for the user (the header is row 1)
    const valueAt = (column: number) => (column === -1 ? "" : (row[column] ?? "").trim());

    const requiredColumns = Math.max(idx.date, idx.time, idx.homeCollege, idx.awayCollege, idx.location);
    if (row.length <= requiredColumns) {
      throw new Error(`Row ${rowNum}: Not enough columns (expected at least ${requiredColumns + 1}).`);
    }

    const date = valueAt(idx.date);
    const time = valueAt(idx.time);
    const homeCollege = valueAt(idx.homeCollege);
    const awayCollege = valueAt(idx.awayCollege);
    const location = valueAt(idx.location);
    const locationExtra = valueAt(idx.locationExtra);
    const rowSport = valueAt(idx.sport);

    // Date: M/D or MM/DD, with an optional 4-digit year (the season supplies
    // the year when it is omitted).
    const dateMatch = date.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
    if (!dateMatch) {
      throw new Error(`Row ${rowNum}: Invalid date format (expected M/D, MM/DD or M/D/YYYY).`);
    }
    if (!/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(time)) {
      throw new Error(`Row ${rowNum}: Invalid time format (expected H:MM AM/PM).`);
    }
    const timestamp = seasonDateTime(date, time, season);
    if (!timestamp || isNaN(new Date(timestamp).getTime())) {
      throw new Error(`Row ${rowNum}: Invalid date/time combination.`);
    }
    // A year in the file that disagrees with the chosen season means the
    // wrong season is selected: say so instead of shifting the match.
    const statedYear = dateMatch[3];
    if (statedYear && new Date(timestamp).getFullYear() !== Number(statedYear)) {
      throw new Error(`Row ${rowNum}: Date ${date} does not fall in the ${season} season.`);
    }

    if (!validCollegeAbbrs.includes(homeCollege)) {
      throw new Error(`Row ${rowNum}: Invalid home college abbreviation: '${homeCollege}'.`);
    }
    if (!validCollegeAbbrs.includes(awayCollege)) {
      throw new Error(`Row ${rowNum}: Invalid away college abbreviation: '${awayCollege}'.`);
    }
    if (homeCollege === awayCollege) throw new Error(`Row ${rowNum}: A college cannot play itself.`);
    if (!location) throw new Error(`Row ${rowNum}: Missing location.`);
    // Every match in one upload is filed under the selected sport, so a sport
    // column that disagrees is a sign the wrong sport is selected.
    if (rowSport && rowSport.toLowerCase() !== sport.toLowerCase()) {
      throw new Error(`Row ${rowNum}: File says '${rowSport}' but '${sport}' is selected.`);
    }

    matches.push({
      startsAt: timestamp,
      homeCollegeId: homeCollege,
      awayCollegeId: awayCollege,
      venue: location,
      venueDetail: locationExtra || null,
    });
  }
  return matches;
}
