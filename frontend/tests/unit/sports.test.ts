import { describe, expect, it } from "vitest";
import { isSportInTerm, sortSports } from "@/lib/sports";
import type { SportDoc } from "@/types/firestore";

describe("sports outside calendar terms", () => {
  it("sorts miscellaneous sports after spring, alphabetically", () => {
    const sports: Pick<SportDoc, "name" | "term">[] = [
      { name: "Ultimate", term: "miscellaneous" }, { name: "Soccer", term: "fall" },
      { name: "Volleyball", term: "spring" }, { name: "Badminton", term: "miscellaneous" },
      { name: "Dodgeball", term: "winter" },
    ];
    expect(sortSports(sports).map((s) => s.name)).toEqual(["Soccer", "Dodgeball", "Volleyball", "Badminton", "Ultimate"]);
    expect(sports[0].name).toBe("Ultimate");
  });
  it("keeps miscellaneous teams available for captains in each term", () => {
    for (const term of ["fall", "winter", "spring"] as const) {
      expect(isSportInTerm({ term: "miscellaneous" }, term)).toBe(true);
    }
    expect(isSportInTerm({ term: "fall" }, "winter")).toBe(false);
  });
});
