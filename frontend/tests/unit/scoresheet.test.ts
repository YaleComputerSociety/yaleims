import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Match } from "@/lib/api/matches";
import type { RosterSheet } from "@/lib/api/roster";
import { scoresheetOf } from "@/components/scoresheet/fromMatch";
import { scoresheetFileName } from "@/components/scoresheet/fileName";
import { sportLayout } from "@/components/scoresheet/sports";
import type { Game } from "@/components/scoresheet/types";

const api = vi.hoisted(() => ({ sheet: vi.fn(), matches: vi.fn() }));
vi.mock("@/lib/api/roster", () => ({ fetchRosterSheet: api.sheet }));
vi.mock("@/lib/api/matches", () => ({ fetchSeasonMatches: api.matches }));

const game = (fields: Partial<Match> & { id: string }): Match =>
  ({
    seasonId: "2026-2027",
    sportId: "13",
    stage: "regular",
    bracketId: null,
    round: null,
    status: "scheduled",
    result: null,
    pointsForWin: 5,
    startsAt: "2026-11-19T01:30:00.000Z",
    venue: "Payne Whitney Gym",
    venueDetail: "Court 2",
    homeCollegeId: "DC",
    awayCollegeId: "BF",
    collegeIds: ["DC", "BF"],
    ...fields,
  }) as Match;

const entry = (collegeId: string, playerId: string, name: string, netid: string | null, captainStatus: "confirmed" | "removed" | null = null) =>
  ({ collegeId, playerId, name, netid, captainStatus }) as RosterSheet["items"][number];

describe("sportLayout", () => {
  it("prints the basketball sheet for the league's hoops sports", () => {
    for (const sport of ["CHoops", "MHoops", "WHoops", "Basketball"]) {
      expect(sportLayout(sport).columns.map((c) => c.header)).toEqual(["Fouls"]);
    }
  });

  it("gives sports without a sheet of their own the default one", () => {
    expect(sportLayout("Kanjam")).toBe(sportLayout("Spikeball"));
    expect(sportLayout("Kanjam").columns).toEqual([]);
  });
});

describe("scoresheetOf", () => {
  beforeEach(() => {
    api.sheet.mockReset();
    api.matches.mockReset();
  });

  it("puts each side's players on the roster, by name, without those taken off", async () => {
    api.sheet.mockResolvedValue({
      items: [
        entry("DC", "u1", "Zoe Adams", "za12"),
        entry("BF", "u2", "Ben Cho", "bc34"),
        entry("DC", "netid-ab56", "Al Brown", null),
        entry("DC", "u3", "Cy Dunn", "cd78", "removed"),
        entry("DC", "u4", "Di Evans", null, "confirmed"),
      ],
    });
    api.matches.mockResolvedValue({ items: [] });
    const sheet = await scoresheetOf(game({ id: "g1" }), "CHoops");
    expect(sheet.home.players).toEqual([
      { netId: "ab56", name: "Al Brown" },
      { netId: "", name: "Di Evans" },
      { netId: "za12", name: "Zoe Adams" },
    ]);
    expect(sheet.away.players).toEqual([{ netId: "bc34", name: "Ben Cho" }]);
    expect(sheet).toMatchObject({ sport: "CHoops", location: "Payne Whitney Gym · Court 2", home: { name: "Davenport" }, away: { name: "Benjamin Franklin" } });
    expect(api.matches).toHaveBeenCalledWith("2026-2027", { sportId: "13", status: "final" });
  });

  it("counts each side's record in the sport, a forfeit as a loss", async () => {
    api.sheet.mockResolvedValue({ items: [] });
    const result = (outcome: "home" | "away" | "draw", forfeit = false) => ({ homeScore: 1, awayScore: 0, outcome, forfeit });
    api.matches.mockResolvedValue({
      items: [
        game({ id: "a", status: "final", result: result("home") }),
        game({ id: "b", status: "final", result: result("draw") }),
        game({ id: "c", status: "final", homeCollegeId: "BF", awayCollegeId: "TC", collegeIds: ["BF", "TC"], result: result("away", true) }),
      ],
    });
    const sheet = await scoresheetOf(game({ id: "g1" }), "CHoops");
    expect(sheet.home.record).toEqual({ wins: 1, losses: 0, ties: 1 });
    expect(sheet.away.record).toEqual({ wins: 0, losses: 2, ties: 1 });
  });

  it("prints a side not known yet as TBD, without reading a roster", async () => {
    api.matches.mockResolvedValue({ items: [] });
    const sheet = await scoresheetOf(game({ id: "g1", homeCollegeId: null, awayCollegeId: null, collegeIds: [], venue: null, venueDetail: null }), "Soccer");
    expect(sheet.home).toEqual({ name: "TBD", players: [] });
    expect(sheet.location).toBe("TBD");
    expect(api.sheet).not.toHaveBeenCalled();
  });
});

describe("scoresheetFileName", () => {
  const sheet = (sport: string, home: string, away: string, startsAt = "2026-11-18T23:00:00.000Z"): Game => ({
    sport,
    startsAt,
    location: "TBD",
    home: { name: home, players: [] },
    away: { name: away, players: [] },
  });

  it("names the file by the game's Eastern date, sport and the colleges' abbreviations", () => {
    expect(scoresheetFileName(sheet("Basketball", "Jonathan Edwards", "Davenport"))).toBe("2026-11-18_basketball_JE_DC.pdf");
    // 8:30 PM Eastern on the 18th is the 19th in UTC.
    expect(scoresheetFileName(sheet("Flag Football", "Saybrook", "Pauli Murray", "2026-11-19T01:30:00.000Z"))).toBe(
      "2026-11-18_flag-football_SY_MY.pdf"
    );
  });

  it("writes a side not known yet as TBD", () => {
    expect(scoresheetFileName(sheet("Soccer", "TBD", "Morse"))).toBe("2026-11-18_soccer_TBD_MC.pdf");
  });
});
