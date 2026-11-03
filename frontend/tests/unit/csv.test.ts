// The admin uploads' CSVs and form rows (lib/csv): dates in a season, the
// schedule CSV, and the bracket and tournament CSVs with their checks.
import { describe, expect, it } from "vitest";
import { bracketErrors, parseBracketCSV, parseTournamentCSV, slotsFromForm, tournamentErrors, withTimestamps } from "@/lib/csv/brackets";
import { seasonDateTime, splitCsvLine } from "@/lib/csv/rows";
import { parseScheduleCsv } from "@/lib/csv/schedule";

const local = (...args: [number, number, number, number, number]) => new Date(...args).toISOString();

describe("rows", () => {
  it("places a date and time in the season (Jan–May in its end year)", () => {
    expect(seasonDateTime("10/5", "7:30 PM", "2026-2027")).toBe(local(2026, 9, 5, 19, 30));
    expect(seasonDateTime("1/23", "7:30PM", "2026-2027")).toBe(local(2027, 0, 23, 19, 30));
    expect(seasonDateTime("2/1", "12:05 AM", "2026-2027")).toBe(local(2027, 1, 1, 0, 5));
    expect(seasonDateTime("", "7:30 PM", "2026-2027")).toBeNull();
  });
  it("splits a CSV line with quoted fields", () => {
    expect(splitCsvLine(' a , "b, c" ,"say ""hi"""')).toEqual(["a", "b, c", 'say "hi"']);
  });
});

describe("schedule CSV", () => {
  const header = "Date,Time,Home,Away,Location,Room";
  it("finds the columns by name", () => {
    const games = parseScheduleCsv(`${header}\n10/5,7:30 PM,MC,BF,Payne Whitney,Court 2\n10/6,8:00 PM,BK,TD,Field,`, "Soccer", "2026-2027");
    expect(games).toEqual([
      { startsAt: local(2026, 9, 5, 19, 30), homeCollegeId: "MC", awayCollegeId: "BF", venue: "Payne Whitney", venueDetail: "Court 2" },
      { startsAt: local(2026, 9, 6, 20, 0), homeCollegeId: "BK", awayCollegeId: "TD", venue: "Field", venueDetail: null },
    ]);
  });
  it("names the first problem", () => {
    const parse = (rows: string, head = header) => () => parseScheduleCsv(`${head}\n${rows}`, "Soccer", "2026-2027");
    expect(parse("10/5,7:30 PM,MC,BF,X", "Date,Time,Home,Location")).toThrow("Missing column(s): awayCollege");
    expect(parse("10/5,7:30 PM,MC,MC,X")).toThrow("Row 2: A college cannot play itself.");
    expect(parse("10/5,7:30 PM,MC,XX,X")).toThrow("Row 2: Invalid away college abbreviation: 'XX'.");
    expect(parse("10/5/2027,7:30 PM,MC,BF,X")).toThrow("Row 2: Date 10/5/2027 does not fall in the 2026-2027 season.");
    expect(parse("10/5,7:30,MC,BF,X")).toThrow("Row 2: Invalid time format");
    expect(parse("10/5,7:30 PM,MC,BF,X,,Cornhole", `${header},Sport`)).toThrow("File says 'Cornhole' but 'Soccer' is selected.");
  });
});

// A complete playoff bracket: byes in slots 1 and 7, seeds 1–7 per division,
// every college once, later rounds empty.
const BRACKET = `matchSlot,awayCollege,awaySeed,homeCollege,homeSeed,date,time,location,locationExtra,division
1,BF,1,BF,1,11/2,7:00 PM,Field,,blue
2,BK,7,BR,2,11/2,7:00 PM,Field,,blue
3,DC,6,ES,3,11/2,7:00 PM,Field,,blue
4,GH,5,JE,4,11/2,7:00 PM,Field,North,blue
5,,,,,11/9,7:00 PM,Field,,blue
6,,,,,11/9,7:00 PM,Field,,blue
7,MC,1,MC,1,11/2,7:00 PM,Field,,green
8,MY,7,PC,2,11/2,7:00 PM,Field,,green
9,SY,6,SM,3,11/2,7:00 PM,Field,,green
10,TD,5,TC,4,11/2,7:00 PM,Field,,green
11,,,,,11/9,7:00 PM,Field,,green
12,,,,,11/9,7:00 PM,Field,,green
13,,,,,11/16,7:00 PM,Field,,blue
14,,,,,11/16,7:00 PM,Field,,green
15,,,,,11/23,7:00 PM,Field,,final`;

describe("bracket CSV", () => {
  it("reads a complete bracket that passes every check", () => {
    const rows = parseBracketCSV(BRACKET, "2026-2027");
    expect(rows).toHaveLength(15);
    expect(rows[3]).toMatchObject({ match_slot: 4, away_college: "GH", home_seed: 4, location_extra: "North", division: "blue", timestamp: local(2026, 10, 2, 19, 0) });
    expect(rows[4]).toMatchObject({ away_college: "TBD", away_seed: -1 });
    expect(bracketErrors(rows)).toEqual([]);
  });
  it("lists what's wrong", () => {
    const rows = parseBracketCSV(BRACKET, "2026-2027");
    rows[1] = { ...rows[1], away_college: "BR" }; // BR twice, BK missing
    expect(bracketErrors(rows)).toEqual([
      "College BR appears 2 times (should only appear once except byes)",
      "College BK is missing from the bracket",
    ]);
    expect(() => parseBracketCSV(BRACKET.replace("11/23,7:00 PM,Field,,final", "11/23,7:00 PM,Field,,red"), "2026-2027")).toThrow(
      "Row 16: Invalid division (must be blue, green, or final)."
    );
  });
  it("turns the rows into the API's slots", () => {
    const [bye, game, later] = slotsFromForm(parseBracketCSV(BRACKET, "2026-2027")).filter((s) => [1, 4, 5].includes(s.slot));
    expect(bye).toMatchObject({ homeCollegeId: "BF", awayCollegeId: "BF", homeSeed: 1, division: "blue" });
    expect(game).toMatchObject({ awayCollegeId: "GH", homeSeed: 4, venue: "Field", venueDetail: "North" });
    expect(later).toMatchObject({ homeCollegeId: null, awayCollegeId: null, homeSeed: null, awaySeed: null });
  });
});

describe("tournament CSV", () => {
  const colleges = ["BK", "BR", "DC", "ES", "GH", "JE", "MY", "PC", "SY", "SM", "TD", "TC"];
  const lines = Array.from({ length: 16 }, (_, i) => {
    const slot = i + 1;
    if (slot === 1) return "1,bf,,bf,,11/2,7:00 PM,Gym,";
    if (slot === 7) return "7,mc,,mc,,11/2,7:00 PM,Gym,";
    const first = [2, 3, 4, 8, 9, 10].indexOf(slot);
    const [away, home] = first >= 0 ? colleges.slice(first * 2, first * 2 + 2) : ["TBD", "TBD"];
    return `${slot},${away},,${home},,11/2,7:00 PM,Gym,`;
  });
  it("reads a complete tournament that passes the checks", () => {
    const rows = parseTournamentCSV(lines.join("\n") + "\n", "2026-2027");
    expect(rows).toHaveLength(16);
    expect(rows[0]).toMatchObject({ away_college: "BF", home_seed: 0, division: "none" });
    expect(tournamentErrors(rows)).toEqual([]);
    expect(tournamentErrors(rows.slice(1))).toContain("Missing match slot 1");
  });
  it("takes typed dates and times over a stale timestamp", () => {
    const [row] = parseTournamentCSV(lines.join("\n"), "2026-2027");
    expect(withTimestamps([{ ...row, date: "3/4", time: "6:00 PM" }], "2026-2027")[0].timestamp).toBe(local(2027, 2, 4, 18, 0));
  });
});
