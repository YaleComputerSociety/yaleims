import { describe, expect, it } from "vitest";
import type { Match } from "@/lib/api/matches";
import { easternMidnight } from "@/lib/dates";
import { competitionOf, dayLabel, groupGames, listBounds, matchesFilter, mergeGames, rowState, type Competition } from "@/lib/games";

const game = (fields: Partial<Match> & { id: string }): Match =>
  ({
    seasonId: "2026-2027",
    sportId: "1",
    stage: "regular",
    bracketId: null,
    round: null,
    status: "scheduled",
    result: null,
    pointsForWin: 6,
    startsAt: "2026-11-12T21:00:00.000Z",
    homeCollegeId: "BK",
    awayCollegeId: "MC",
    collegeIds: ["BK", "MC"],
    ...fields,
  }) as Match;
const final = { homeScore: 2, awayScore: 1, outcome: "home" as const, forfeit: false };
const soccer = { name: "Soccer", emoji: "⚽" };
const spikeball = { name: "Spikeball", emoji: "💥" };
const sportOf = (g: Match) => (g.sportId === "1" ? soccer : spikeball);
const competition = (g: Match): Competition => competitionOf(g, sportOf(g), g.bracketId === "fall-classic" ? { kind: "tournament", name: "Fall Classic" } : undefined);

describe("rowState", () => {
  const at = new Date("2026-11-12T21:00:00.000Z");
  it("is upcoming before the start, live for the hour after it, then not scored", () => {
    expect(rowState(game({ id: "a" }), new Date(at.getTime() - 1))).toBe("upcoming");
    expect(rowState(game({ id: "a" }), at)).toBe("live");
    expect(rowState(game({ id: "a" }), new Date(at.getTime() + 59 * 60_000))).toBe("live");
    expect(rowState(game({ id: "a" }), new Date(at.getTime() + 60 * 60_000))).toBe("unscored");
  });
  it("is final with a result and cancelled whatever the time", () => {
    expect(rowState(game({ id: "a", status: "final", result: final }), at)).toBe("final");
    expect(rowState(game({ id: "a", status: "cancelled" }), new Date(at.getTime() - 1))).toBe("cancelled");
  });
});

describe("competitionOf", () => {
  it("lists a regular game under its sport, a playoff game under the sport's playoffs, a tournament game under the tournament", () => {
    expect(competition(game({ id: "a" }))).toEqual({ key: "sport:1", kind: "regular", sportId: "1", emoji: "⚽", name: "Soccer", href: null });
    expect(competition(game({ id: "b", stage: "playoff", bracketId: "soccer-playoffs", round: "Semifinal" }))).toMatchObject({
      key: "playoffs:1", kind: "playoffs", name: "Soccer Playoffs", href: "/brackets?season=2026-2027&sport=1",
    });
    expect(competition(game({ id: "c", stage: "playoff", bracketId: "fall-classic" }))).toMatchObject({
      key: "tournament:fall-classic", kind: "tournament", name: "Fall Classic", href: "/tournaments?season=2026-2027&id=fall-classic",
    });
  });
  it("copes with an unknown sport", () => {
    expect(competitionOf(game({ id: "a", sportId: "99" }), undefined, undefined).name).toBe("Unknown sport");
  });
});

describe("groupGames", () => {
  const games = [
    game({ id: "a", startsAt: "2026-11-12T21:00:00.000Z" }), // 4 pm EST, Soccer
    game({ id: "b", startsAt: "2026-11-12T21:00:00.000Z", sportId: "2" }), // Spikeball at the same time
    game({ id: "c", startsAt: "2026-11-12T22:15:00.000Z" }), // Soccer again
    game({ id: "d", startsAt: "2026-11-13T04:30:00.000Z" }), // 11:30 pm EST, still the 12th
    game({ id: "e", startsAt: "2026-11-13T05:30:00.000Z" }), // 12:30 am EST: the 13th
  ];
  it("splits days at Eastern midnight and keeps a competition's games together, competitions by their first game", () => {
    const days = groupGames(games, competition);
    expect(days.map((d) => d.day)).toEqual(["2026-11-12", "2026-11-13"]);
    expect(days[0].competitions.map((c) => [c.name, c.games.map((g) => g.id)])).toEqual([
      ["Soccer", ["a", "c", "d"]],
      ["Spikeball", ["b"]],
    ]);
    expect(days[1].competitions.map((c) => c.games.map((g) => g.id))).toEqual([["e"]]);
  });
  it("follows the list's order when it runs newest first", () => {
    const days = groupGames([...games].reverse(), competition);
    expect(days.map((d) => d.day)).toEqual(["2026-11-13", "2026-11-12"]);
    expect(days[1].competitions[0].games.map((g) => g.id)).toEqual(["d", "c", "a"]);
  });
});

describe("dayLabel", () => {
  it("names today, tomorrow and yesterday, else the weekday and date", () => {
    expect(dayLabel("2026-11-12", "2026-11-12")).toBe("Today · Thursday, Nov 12");
    expect(dayLabel("2026-11-13", "2026-11-12")).toBe("Tomorrow · Friday, Nov 13");
    expect(dayLabel("2026-11-11", "2026-11-12")).toBe("Yesterday · Wednesday, Nov 11");
    expect(dayLabel("2026-11-20", "2026-11-12")).toBe("Friday, Nov 20");
  });
});

describe("mergeGames", () => {
  const a = game({ id: "a", startsAt: "2026-11-12T21:00:00.000Z" });
  const b = game({ id: "b", startsAt: "2026-11-12T21:00:00.000Z" });
  const c = game({ id: "c", startsAt: "2026-11-12T22:00:00.000Z" });
  it("keeps each game once, the newer copy, by start then id", () => {
    const scored = { ...c, status: "final" as const, result: final };
    expect(mergeGames([c, a], [scored, b], "asc").map((g) => [g.id, g.status])).toEqual([["a", "scheduled"], ["b", "scheduled"], ["c", "final"]]);
    expect(mergeGames([a], [c, b], "desc").map((g) => g.id)).toEqual(["c", "b", "a"]);
  });
});

describe("listBounds", () => {
  const now = new Date("2026-11-12T20:00:00.000Z");
  it("runs from the anchor day on, oldest first, by default and for upcoming or cancelled games", () => {
    expect(listBounds({}, "2026-11-12", now)).toEqual({ order: "asc", from: easternMidnight("2026-11-12") });
    expect(listBounds({ status: "upcoming" }, "2026-11-12", now)).toEqual({ order: "asc", from: now, status: "scheduled" });
    expect(listBounds({ status: "cancelled" }, "2026-11-12", now)).toEqual({ order: "asc", from: easternMidnight("2026-11-12"), status: "cancelled" });
  });
  it("runs newest first for finished games: scored from the end of the day, not yet scored from now", () => {
    const endOfDay = new Date(easternMidnight("2026-11-13").getTime() - 1);
    expect(listBounds({ status: "scored" }, "2026-11-12", now)).toEqual({ order: "desc", to: endOfDay, status: "final" });
    expect(listBounds({ status: "unscored" }, "2026-11-12", now)).toEqual({ order: "desc", to: now, status: "scheduled" });
  });
});

describe("matchesFilter", () => {
  const now = new Date("2026-11-12T22:00:00.000Z");
  const past = game({ id: "p", startsAt: "2026-11-12T21:00:00.000Z" });
  const future = game({ id: "f", startsAt: "2026-11-12T23:00:00.000Z", sportId: "2", homeCollegeId: "TD", awayCollegeId: "SY", collegeIds: ["TD", "SY"] });
  const scored = game({ id: "s", status: "final", result: final });
  const tournament = game({ id: "t", stage: "playoff", bracketId: "fall-classic" });
  const passes = (g: Match, filter: Parameters<typeof matchesFilter>[1]) => matchesFilter(g, filter, competition(g), now);
  it("filters by sport, college, kind, status and the favorites' lists", () => {
    expect(passes(past, { sportId: "1" })).toBe(true);
    expect(passes(future, { sportId: "1" })).toBe(false);
    expect(passes(past, { collegeId: "MC" })).toBe(true);
    expect(passes(future, { collegeId: "MC" })).toBe(false);
    expect(passes(tournament, { kind: "tournament" })).toBe(true);
    expect(passes(past, { kind: "tournament" })).toBe(false);
    expect(passes(past, { status: "unscored" })).toBe(true);
    expect(passes(future, { status: "upcoming" })).toBe(true);
    expect(passes(past, { status: "upcoming" })).toBe(false);
    expect(passes(scored, { status: "scored" })).toBe(true);
    expect(passes(future, { collegeIds: ["TD"], sportIds: ["1"] })).toBe(true); // a favorite college
    expect(passes(past, { collegeIds: ["TD"], sportIds: ["1"] })).toBe(true); // a favorite sport
    expect(passes(future, { collegeIds: ["MC"], sportIds: ["1"] })).toBe(false);
  });
});
