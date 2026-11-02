// What every admin upload's rows share (schedule, bracket and tournament
// CSVs, and the bracket forms): a date and time within a season, and
// splitting a CSV line. Used in the browser.

/**
 * A row's date ("M/D" or "MM/DD"; a "/YYYY" suffix is ignored) and time
 * ("H:MM AM/PM", the space optional) in a season ("2026-2027") as an ISO
 * instant; null when one is missing. Jan–May fall in the season's end year,
 * every other month in its start year. Read in the browser's time zone (the
 * admins' Eastern time).
 */
export function seasonDateTime(dateStr: string, timeStr: string, season: string): string | null {
  if (!dateStr || !timeStr || !season) return null;

  const [mm, dd] = dateStr.split("/").map(Number);
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

  const [startYear, endYear] = season.split("-").map((y) => parseInt(y, 10));
  const year = mm >= 1 && mm <= 5 ? endYear : startYear;
  return new Date(year, mm - 1, dd, hh, min, 0, 0).toISOString();
}

/** Splits one CSV line, honouring "quoted, fields" and "" escapes; cells are trimmed. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** The file's non-empty lines. */
export function csvLines(text: string): string[] {
  return text.trim().split(/\r?\n/).filter(Boolean);
}
