import { describe, expect, it } from "vitest";
import { seesParticipants, shownEntries } from "@/lib/participants";

describe("seesParticipants", () => {
  const game = { collegeIds: ["BF", "MY"] };
  const viewer = { staff: false, collegeId: null, onGame: false };
  it("is for staff, the playing colleges' players and anyone on the game", () => {
    expect(seesParticipants({ ...viewer, staff: true }, game)).toBe(true);
    expect(seesParticipants({ ...viewer, collegeId: "MY" }, game)).toBe(true);
    expect(seesParticipants({ ...viewer, collegeId: "SY", onGame: true }, game)).toBe(true);
    expect(seesParticipants({ ...viewer, onGame: true }, game)).toBe(true);
    expect(seesParticipants({ ...viewer, collegeId: "SY" }, game)).toBe(false);
    expect(seesParticipants(viewer, game)).toBe(false);
  });
});

describe("shownEntries", () => {
  const side = (collegeId: string) => [
    { id: `${collegeId} signed up`, collegeId, captainStatus: null, present: false },
    { id: `${collegeId} confirmed`, collegeId, captainStatus: "confirmed" as const, present: false },
    { id: `${collegeId} taken off`, collegeId, captainStatus: "removed" as const, present: false },
    { id: `${collegeId} never recorded`, collegeId, captainStatus: null, present: null },
  ];
  it("lists a side's players until a supervisor records one present, then only those present", () => {
    const before = [...side("BF"), ...side("GH")];
    expect(shownEntries(before).map((e) => e.id)).toEqual(["BF signed up", "BF confirmed", "BF never recorded", "GH signed up", "GH confirmed", "GH never recorded"]);
    const taking = [...side("BF"), { id: "BF present", collegeId: "BF", captainStatus: null, present: true }, ...side("GH")];
    expect(shownEntries(taking).map((e) => e.id)).toEqual(["BF present", "GH signed up", "GH confirmed", "GH never recorded"]);
    // Taken off: never listed, nor does an old presence of theirs start attendance on the side (C12).
    const takenOff = [...side("BF"), { id: "BF off, present", collegeId: "BF", captainStatus: "removed" as const, present: true }];
    expect(shownEntries(takenOff).map((e) => e.id)).toEqual(["BF signed up", "BF confirmed", "BF never recorded"]);
  });
});
