// The playoff bracket and tournament upload forms (Hub → Brackets,
// Tournaments): their rows, reading a CSV into rows, checking the rows, and
// rows → the API's v3 slots. A playoff bracket has 15 slots in two divisions
// (blue, green) and a final; a tournament has the same shape plus a 16th
// slot, the third place game, and no divisions. Slots 1 and 7 are byes.
import type { BracketSlotInput } from "../api/brackets";
import { COLLEGES } from "../colleges";
import { csvLines, seasonDateTime } from "./rows";

/**
 * One row of the forms (and of their CSVs), in the field names the forms
 * have always used. A seed of -1 or 0 is none; "" and "TBD" are empty sides.
 */
export interface SlotRow {
  match_slot: number;
  home_college: string;
  home_seed: number;
  away_college: string;
  away_seed: number;
  location: string;
  location_extra?: string;
  /** ISO instant, from date + time. */
  timestamp: string;
  /** "blue" | "green" | "final"; tournaments "none". */
  division: string;
  /** "M/D", as typed. */
  date?: string;
  /** "H:MM AM/PM", as typed. */
  time?: string;
}

export const TOURNAMENT_SLOT_COUNT = 16;
const BYE_SLOTS = [1, 7];
const collegeIds: string[] = COLLEGES.map((c) => c.id);

/** The rows with their timestamp set from the date and time typed in (rows without both keep theirs). */
export function withTimestamps(rows: SlotRow[], season: string): SlotRow[] {
  return rows.map((row) => {
    const timestamp = row.date && row.time ? seasonDateTime(row.date, row.time, season) : null;
    return timestamp ? { ...row, timestamp } : row;
  });
}

// ── CSV ────────────────────────────────────────────────────────────────────

/**
 * A playoff bracket CSV's rows. Columns: matchSlot, awayCollege, awaySeed,
 * homeCollege, homeSeed, date, time, location, locationExtra, division (the
 * header row is optional). Throws an Error naming the first bad row.
 */
export function parseBracketCSV(csvText: string, season: string): SlotRow[] {
  const lines = csvLines(csvText);
  if (lines.length < 2) throw new Error("CSV must have at least one data row.");
  const header = lines[0].toLowerCase().replace(/\s+/g, "");
  const expectedColumns = [
    "matchslot", "awaycollege", "awayseed", "homecollege", "homeseed",
    "date", "time", "location", "locationextra", "division",
  ];
  const startLine = expectedColumns.every((col) => header.includes(col)) ? 1 : 0;

  const rows: SlotRow[] = [];
  for (let i = startLine; i < lines.length; i++) {
    const row = lines[i].split(",").map((v) => v.trim());
    const rowNum = i + 1;
    if (row.length < 10) throw new Error(`Row ${rowNum}: Not enough columns (expected 10).`);
    if (row.length > 10) throw new Error(`Row ${rowNum}: Too many columns (expected 10).`);
    const [matchSlot, awayCollege, awaySeed, homeCollege, homeSeed, date, time, location, locationExtra, division] = row;

    const match_slot = Number(matchSlot);
    if (isNaN(match_slot) || match_slot < 1 || match_slot > 15) {
      throw new Error(`Row ${rowNum}: Invalid match slot (must be 1-15).`);
    }
    const away_college = awayCollege || "TBD";
    const home_college = homeCollege || "TBD";
    if (away_college !== "TBD" && !collegeIds.includes(away_college)) {
      throw new Error(`Row ${rowNum}: Invalid away college abbreviation: '${away_college}'.`);
    }
    if (home_college !== "TBD" && !collegeIds.includes(home_college)) {
      throw new Error(`Row ${rowNum}: Invalid home college abbreviation: '${home_college}'.`);
    }
    const away_seed = awaySeed ? Number(awaySeed) : -1;
    const home_seed = homeSeed ? Number(homeSeed) : -1;
    if (away_seed !== -1 && (away_seed < 1 || away_seed > 7)) {
      throw new Error(`Row ${rowNum}: Invalid away seed (must be 1-7 or blank for -1).`);
    }
    if (home_seed !== -1 && (home_seed < 1 || home_seed > 7)) {
      throw new Error(`Row ${rowNum}: Invalid home seed (must be 1-7 or blank for -1).`);
    }
    if (!location) throw new Error(`Row ${rowNum}: Missing location.`);
    if (!/^\d{1,2}\/\d{1,2}$/.test(date)) {
      throw new Error(`Row ${rowNum}: Invalid date format (expected M/D or MM/DD).`);
    }
    if (!/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(time)) {
      throw new Error(`Row ${rowNum}: Invalid time format (expected H:MM AM/PM).`);
    }
    const timestamp = seasonDateTime(date, time, season);
    if (!timestamp || isNaN(new Date(timestamp).getTime())) {
      throw new Error(`Row ${rowNum}: Invalid date/time combination.`);
    }
    const div = division.toLowerCase();
    if (!["blue", "green", "final"].includes(div)) {
      throw new Error(`Row ${rowNum}: Invalid division (must be blue, green, or final).`);
    }
    rows.push({
      match_slot,
      away_college,
      away_seed,
      home_college,
      home_seed,
      location,
      ...(locationExtra ? { location_extra: locationExtra } : {}),
      timestamp,
      division: div,
      date,
      time,
    });
  }
  return rows;
}

/**
 * A tournament CSV's rows: the bracket CSV without the division column.
 * Colleges are uppercased; a blank or non-numeric seed is 0 (none).
 */
export function parseTournamentCSV(csvText: string, season: string): SlotRow[] {
  const lines = csvLines(csvText);
  if (lines.length < 2) throw new Error("CSV must have at least one data row.");
  const header = lines[0].toLowerCase().replace(/\s+/g, "");
  const expectedColumns = [
    "matchslot", "awaycollege", "awayseed", "homecollege", "homeseed",
    "date", "time", "location", "locationextra",
  ];
  const startLine = expectedColumns.every((col) => header.includes(col)) ? 1 : 0;

  const rows: SlotRow[] = [];
  for (let i = startLine; i < lines.length; i++) {
    const row = lines[i].split(",").map((v) => v.trim());
    const rowNum = i + 1;
    if (row.length < 9) throw new Error(`Row ${rowNum}: Not enough columns (expected 9).`);
    if (row.length > 9) throw new Error(`Row ${rowNum}: Too many columns (expected 9).`);
    const [matchSlot, awayCollege, awaySeed, homeCollege, homeSeed, date, time, location, locationExtra] = row;

    const match_slot = Number(matchSlot);
    if (!Number.isInteger(match_slot) || match_slot < 1 || match_slot > TOURNAMENT_SLOT_COUNT) {
      throw new Error(`Row ${rowNum}: Match slot must be between 1 and ${TOURNAMENT_SLOT_COUNT}.`);
    }
    const away_college = awayCollege.toUpperCase();
    const home_college = homeCollege.toUpperCase();
    for (const college of [away_college, home_college]) {
      if (college && college !== "TBD" && !collegeIds.includes(college)) {
        throw new Error(`Row ${rowNum}: Unknown college '${college}'.`);
      }
    }
    const timestamp = seasonDateTime(date, time, season);
    if (!timestamp || isNaN(new Date(timestamp).getTime())) {
      throw new Error(`Row ${rowNum}: Invalid date/time combination.`);
    }
    rows.push({
      match_slot,
      away_college,
      away_seed: Number(awaySeed) || 0,
      home_college,
      home_seed: Number(homeSeed) || 0,
      location,
      ...(locationExtra ? { location_extra: locationExtra } : {}),
      timestamp,
      division: "none",
      date,
      time,
    });
  }
  return rows;
}

// ── Checks before upload ───────────────────────────────────────────────────

const isCollege = (college: string) => !!college && college !== "TBD";

/** Every slot 1..count is present: one message per missing slot. */
function missingSlots(rows: SlotRow[], count: number): string[] {
  const slots = rows.map((r) => r.match_slot);
  const errors: string[] = [];
  for (let i = 1; i <= count; i++) if (!slots.includes(i)) errors.push(`Missing match slot ${i}`);
  return errors;
}

/** Each college is entered exactly once (a bye's college once), and every college is there. */
function collegeCountErrors(counts: Record<string, number>, what: string, whereMissing: string): string[] {
  const errors: string[] = [];
  for (const [college, count] of Object.entries(counts)) {
    if (count > 1) errors.push(`College ${college} appears ${count} times (${what})`);
  }
  for (const id of collegeIds) {
    if (!counts[id]) errors.push(`College ${id} is missing from the ${whereMissing}`);
  }
  return errors;
}

/** What's wrong with a playoff bracket's rows (none: ready to upload), each as a message to show. */
export function bracketErrors(rows: SlotRow[]): string[] {
  const errors = missingSlots(rows, 15);

  // Byes: the same college home and away, both seeds 1.
  for (const slot of BYE_SLOTS) {
    const m = rows.find((r) => r.match_slot === slot);
    if (!m) {
      errors.push(`Missing bye match slot ${slot}`);
    } else if (!m.away_college || !m.home_college || m.away_college !== m.home_college || m.away_seed !== 1 || m.home_seed !== 1) {
      errors.push(`Bye match slot ${slot} must have the same college for home and away, and both seeds must be 1.`);
    }
  }

  // Valid colleges, each once (a bye counts once).
  const counts: Record<string, number> = {};
  rows.forEach((m, idx) => {
    if (isCollege(m.away_college) && !collegeIds.includes(m.away_college)) {
      errors.push(`Invalid away college in row ${idx + 1}: ${m.away_college}`);
    }
    if (isCollege(m.home_college) && !collegeIds.includes(m.home_college)) {
      errors.push(`Invalid home college in row ${idx + 1}: ${m.home_college}`);
    }
    const isBye = BYE_SLOTS.includes(m.match_slot) && m.away_college === m.home_college;
    for (const college of isBye ? [m.away_college] : [m.away_college, m.home_college]) {
      if (isCollege(college)) counts[college] = (counts[college] || 0) + 1;
    }
  });
  errors.push(...collegeCountErrors(counts, "should only appear once except byes", "bracket"));

  // Seeds 1-7 once per division (a bye's seed 1 counts once).
  const divisionSeeds: Record<string, Record<number, number>> = { blue: {}, green: {} };
  for (const m of rows) {
    if (m.division !== "blue" && m.division !== "green") continue;
    const seeds = divisionSeeds[m.division];
    if (BYE_SLOTS.includes(m.match_slot) && m.away_seed === 1 && m.home_seed === 1) {
      seeds[1] = (seeds[1] || 0) + 1;
      continue;
    }
    for (const { seed, college } of [
      { seed: m.away_seed, college: m.away_college },
      { seed: m.home_seed, college: m.home_college },
    ]) {
      if (seed >= 1 && seed <= 7 && isCollege(college)) seeds[seed] = (seeds[seed] || 0) + 1;
    }
  }
  for (const div of ["blue", "green"]) {
    for (let s = 1; s <= 7; s++) {
      const count = divisionSeeds[div][s] || 0;
      if (count > 1) errors.push(`Seed ${s} appears ${count} times in ${div} division (should only appear once except byes)`);
      if (count === 0) errors.push(`Seed ${s} missing from ${div} division`);
    }
  }

  rows.forEach((m, idx) => {
    if (m.timestamp === "" || isNaN(Date.parse(m.timestamp))) errors.push(`Invalid or missing timestamp in row ${idx + 1}`);
  });
  rows.forEach((m, idx) => {
    if (!m.location || m.location.trim() === "") errors.push(`Missing location in row ${idx + 1}`);
  });

  // 7 blue, 7 green, 1 final.
  const inDivision = (d: string) => rows.filter((m) => m.division === d).length;
  if (inDivision("blue") !== 7) errors.push(`There must be 7 blue division matches (found ${inDivision("blue")})`);
  if (inDivision("green") !== 7) errors.push(`There must be 7 green division matches (found ${inDivision("green")})`);
  if (inDivision("final") !== 1) errors.push(`There must be 1 final match (found ${inDivision("final")})`);

  // Later rounds wait for winners: no colleges, seeds -1.
  for (const slot of [5, 6, 11, 12, 13, 14, 15]) {
    const m = rows.find((r) => r.match_slot === slot);
    if (!m) continue;
    const awayOk = !isCollege(m.away_college) && m.away_seed === -1;
    const homeOk = !isCollege(m.home_college) && m.home_seed === -1;
    if (!awayOk || !homeOk) errors.push(`Match slot ${slot} should have no selected colleges (or 'TBD') and seeds -1`);
  }
  return errors;
}

/**
 * What's wrong with a tournament's rows: the bracket's structural rules
 * (every slot, byes doubled up on slots 1 and 7, each college once) without
 * the division and seed checks.
 */
export function tournamentErrors(rows: SlotRow[]): string[] {
  const errors = missingSlots(rows, TOURNAMENT_SLOT_COUNT);
  for (const slot of BYE_SLOTS) {
    const m = rows.find((r) => r.match_slot === slot);
    if (!m) {
      errors.push(`Missing bye match slot ${slot}`);
    } else if (!m.away_college || !m.home_college || m.away_college !== m.home_college) {
      errors.push(`Bye match slot ${slot} must list the same college for home and away.`);
    }
  }
  const counts: Record<string, number> = {};
  for (const m of rows) {
    const isBye = BYE_SLOTS.includes(m.match_slot) && m.away_college === m.home_college;
    for (const college of isBye ? [m.home_college] : [m.away_college, m.home_college]) {
      if (isCollege(college)) counts[college] = (counts[college] || 0) + 1;
    }
  }
  errors.push(...collegeCountErrors(counts, "each college should be entered once", "tournament"));
  return errors;
}

// ── Rows → the API ─────────────────────────────────────────────────────────

/**
 * The rows as v3 slots for POST …/brackets: "" and "TBD" are empty sides, a
 * negative seed is none, divisions are lowercased ("none" is none). Unknown
 * colleges pass through; the server refuses them.
 */
export function slotsFromForm(rows: SlotRow[]): BracketSlotInput[] {
  const college = (value: unknown) => (typeof value === "string" && value !== "" && value !== "TBD" ? value : null);
  const division = (value: unknown) => {
    const v = typeof value === "string" ? value.toLowerCase() : "";
    return v === "blue" || v === "green" || v === "final" ? v : null;
  };
  const seed = (value: number | undefined) => (typeof value === "number" && value >= 0 ? value : null);
  return rows.map((s) => ({
    slot: s.match_slot,
    homeCollegeId: college(s.home_college),
    awayCollegeId: college(s.away_college),
    homeSeed: seed(s.home_seed),
    awaySeed: seed(s.away_seed),
    division: division(s.division),
    startsAt: s.timestamp || null,
    venue: s.location || null,
    venueDetail: s.location_extra || null,
  }));
}
