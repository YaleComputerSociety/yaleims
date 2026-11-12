import { describe, expect, it } from "vitest";
import { assignmentsOf, countsAsAttended, disputed, expectedCollege, type Assignment, type Attended } from "@/lib/attendance";

const at = (ms: number) => ({ seconds: ms / 1000, nanoseconds: 0, toDate: () => new Date(ms), toMillis: () => ms });
const game = (collegeId: string, startsAt: number, adminConfirmed = false): Attended => ({ collegeId, startsAt, adminConfirmed });

describe("countsAsAttended", () => {
  it("counts a supervisor's presence, not one taken off the game", () => {
    expect(countsAsAttended({ present: true, captainStatus: null })).toBe(true);
    expect(countsAsAttended({ present: true, captainStatus: "confirmed" })).toBe(true);
    expect(countsAsAttended({ present: true, captainStatus: "removed" })).toBe(false);
    expect(countsAsAttended({ present: false, captainStatus: "confirmed" })).toBe(false);
    expect(countsAsAttended({ present: null, captainStatus: null })).toBe(false);
  });
});

describe("assignmentsOf", () => {
  it("reads the history, or a legacy college as assigned at join", () => {
    expect(assignmentsOf({ collegeId: "BF", joinedAt: at(5), collegeHistory: [{ collegeId: "BF", source: "yalies", since: at(7) }] }))
      .toEqual([{ collegeId: "BF", since: 7 }]);
    expect(assignmentsOf({ collegeId: "MY", joinedAt: at(5) })).toEqual([{ collegeId: "MY", since: 5 }]);
    expect(assignmentsOf({ collegeId: null, joinedAt: at(5) })).toEqual([]);
  });
});

describe("expectedCollege", () => {
  const history: Assignment[] = [
    { collegeId: "MY", since: 10 },
    { collegeId: null, since: 20 },
    { collegeId: "BF", since: 30 },
  ];
  it("is the college held at the start, else the first assigned after", () => {
    expect(expectedCollege(history, 5)).toBe("MY");
    expect(expectedCollege(history, 15)).toBe("MY");
    expect(expectedCollege(history, 25)).toBe("BF");
    expect(expectedCollege(history, 35)).toBe("BF");
    expect(expectedCollege([], 35)).toBeNull();
  });
});

describe("disputed", () => {
  it("puts the other college's games under review (MY then BF games, assigned BF)", () => {
    expect(disputed([{ collegeId: "BF", since: 0 }], [game("MY", 10), game("BF", 20)])).toEqual([true, false]);
  });
  it("keeps games played before a mid-season change (4c)", () => {
    const history = [{ collegeId: "MY", since: 0 }, { collegeId: "BF", since: 15 }];
    expect(disputed(history, [game("MY", 10), game("BF", 20), game("MY", 30)])).toEqual([false, false, true]);
  });
  it("with no college: one college is fine, two are all under review", () => {
    expect(disputed([], [game("MY", 10), game("MY", 20)])).toEqual([false, false]);
    expect(disputed([], [game("MY", 10), game("BF", 20)])).toEqual([true, true]);
  });
  it("an admin's confirmation overrides", () => {
    expect(disputed([{ collegeId: "BF", since: 0 }], [game("MY", 10, true)])).toEqual([false]);
    expect(disputed([], [game("MY", 10, true), game("BF", 20)])).toEqual([false, true]);
  });
});
