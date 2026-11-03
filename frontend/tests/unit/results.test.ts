import { describe, expect, it } from "vitest";
import { standingDeltas, teamDeltas, winnerId } from "@/lib/results";

describe("standingDeltas", () => {
  it("gives the winner the sport's points and the loser a loss", () => {
    expect(standingDeltas("MC", "SY", { outcome: "home", forfeit: false }, 11)).toEqual({
      MC: { games: 1, wins: 1, points: 11 },
      SY: { games: 1, losses: 1 },
    });
  });
  it("counts a forfeiting loser's forfeit instead of a loss", () => {
    expect(standingDeltas("MC", "SY", { outcome: "home", forfeit: true }, 6).SY).toEqual({ games: 1, forfeits: 1 });
  });
  it("splits the points on a draw and on a double forfeit", () => {
    expect(standingDeltas("MC", "SY", { outcome: "draw", forfeit: false }, 6).SY).toEqual({ games: 1, ties: 1, points: 3 });
    expect(standingDeltas("MC", "SY", { outcome: "double_forfeit", forfeit: false }, 6).MC).toEqual({ games: 1, forfeits: 1, points: 3 });
  });
});

describe("teamDeltas", () => {
  it("records the scores for and against, without points", () => {
    expect(teamDeltas("MC", "SY", { homeScore: 3, awayScore: 1, outcome: "home", forfeit: false })).toEqual({
      MC: { games: 1, wins: 1, pointsFor: 3, pointsAgainst: 1 },
      SY: { games: 1, losses: 1, pointsFor: 1, pointsAgainst: 3 },
    });
  });
  it("treats a missing score as 0", () => {
    expect(teamDeltas("MC", "SY", { homeScore: null, awayScore: null, outcome: "draw", forfeit: false }).MC).toMatchObject({ pointsFor: 0, pointsAgainst: 0 });
  });
});

describe("winnerId", () => {
  it("names the winning side, or nobody", () => {
    expect(winnerId("MC", "SY", { outcome: "away" })).toBe("SY");
    expect(winnerId("MC", "SY", { outcome: "draw" })).toBeNull();
  });
});
