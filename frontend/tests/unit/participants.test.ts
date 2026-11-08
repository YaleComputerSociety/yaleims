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
  const entries = [
    { id: "signed up", captainStatus: null, present: false },
    { id: "confirmed", captainStatus: "confirmed" as const, present: false },
    { id: "taken off", captainStatus: "removed" as const, present: false },
    { id: "present", captainStatus: null, present: true },
    { id: "never recorded", captainStatus: null, present: null },
  ];
  it("lists the game's players before the start, those recorded present from it", () => {
    expect(shownEntries(entries, false).map((e) => e.id)).toEqual(["signed up", "confirmed", "present", "never recorded"]);
    expect(shownEntries(entries, true).map((e) => e.id)).toEqual(["present"]);
  });
});
