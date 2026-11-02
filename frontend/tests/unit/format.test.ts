import { describe, expect, it } from "vitest";
import type { Match } from "@/lib/api/matches";
import { collegeName } from "@/lib/colleges";
import { calendarLink, getPlace, groupByDay, matchTypeLabel, pointsEarned, sideName } from "@/lib/format";

const game = (fields: Partial<Match>): Match =>
  ({ stage: "regular", round: null, result: null, pointsForWin: 6, startsAt: "2026-11-01T22:00:00.000Z", ...fields }) as Match;

describe("names", () => {
  it("names a college by id, and a side waiting for a winner TBD", () => {
    expect(collegeName("MC")).toBe("Morse");
    expect(collegeName("XX")).toBeNull();
    expect(sideName(null)).toBe("TBD");
  });
  it("writes places", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(getPlace)).toEqual(
      ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "103rd"]
    );
    expect(getPlace(undefined)).toBe("");
  });
});

describe("matchTypeLabel", () => {
  it("labels regular, playoff and tournament games", () => {
    expect(matchTypeLabel(game({}), false)).toBe("Regular Season");
    expect(matchTypeLabel(game({ stage: "playoff", round: "Semifinal" }), false)).toBe("Semifinal Round");
    expect(matchTypeLabel(game({ stage: "playoff", round: "Playoff" }), true)).toBe("Round 1");
    expect(matchTypeLabel(game({ stage: "playoff", round: "Third Place" }), true)).toBe("3rd Place Game");
    expect(matchTypeLabel(game({ stage: "playoff", round: "Final" }), true)).toBe("Final");
  });
});

describe("pointsEarned", () => {
  it("gives the winner the game's points, half each for a draw or double forfeit", () => {
    const result = (outcome: NonNullable<Match["result"]>["outcome"]) => ({ homeScore: 1, awayScore: 0, outcome, forfeit: false });
    expect(pointsEarned(game({ result: result("home") }), "home")).toBe(6);
    expect(pointsEarned(game({ result: result("home") }), "away")).toBeNull();
    expect(pointsEarned(game({ result: result("draw"), pointsForWin: 11 }), "away")).toBe(5.5);
    expect(pointsEarned(game({ result: result("double_forfeit") }), "home")).toBe(3);
    expect(pointsEarned(game({}), "home")).toBeNull();
  });
});

describe("groupByDay and calendarLink", () => {
  it("groups games by start day in order", () => {
    const days = groupByDay([game({ id: "a" }), game({ id: "b" }), game({ id: "c", startsAt: "2026-11-03T22:00:00.000Z" })]);
    expect([...days.values()].map((ms) => ms.map((m) => m.id))).toEqual([["a", "b"], ["c"]]);
  });
  it("adds the game as a one-hour event", () => {
    const link = new URL(calendarLink(game({ homeCollegeId: "MC", awayCollegeId: "BK", venue: "Field", venueDetail: "2" }), "Soccer"));
    expect(link.searchParams.get("text")).toBe("IM Soccer: MC vs. BK");
    expect(link.searchParams.get("details")).toBe("Intramural Soccer match between Morse and Berkeley.");
    expect(link.searchParams.get("location")).toBe("Field 2");
    expect(link.searchParams.get("dates")).toBe("20261101T220000Z/20261101T230000Z");
  });
});
