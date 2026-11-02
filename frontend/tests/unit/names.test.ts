import { describe, expect, it } from "vitest";
import { bracketIdOf, playoffsName } from "@/lib/brackets";
import { COLLEGES, collegeIdOfName } from "@/lib/colleges";
import { paths } from "@/lib/paths";
import { slugify } from "@/lib/slug";

describe("colleges", () => {
  it("lists the 14 colleges with unique ids", () => {
    expect(new Set(COLLEGES.map((c) => c.id)).size).toBe(14);
  });
  it("finds a college by name, with or without ' College', or by id", () => {
    const colleges = [...COLLEGES];
    expect(collegeIdOfName(colleges, "Morse College")).toBe("MC");
    expect(collegeIdOfName(colleges, " Pauli Murray ")).toBe("MY");
    expect(collegeIdOfName(colleges, "TD")).toBe("TD");
    expect(collegeIdOfName(colleges, "Hogwarts")).toBeNull();
    expect(collegeIdOfName(colleges, undefined)).toBeNull();
  });
});

describe("bracket ids", () => {
  it("names a sport's playoffs and slugs bracket names", () => {
    expect(playoffsName("Flag Football")).toBe("Flag Football Playoffs");
    expect(bracketIdOf("Flag Football Playoffs")).toBe("flag-football-playoffs");
    expect(slugify("  One Day / Tournament! ")).toBe("one-day-tournament");
    expect(slugify("!!!")).toBe("");
  });
});

describe("paths", () => {
  it("builds the v3 tree", () => {
    expect(paths.rosterEntry("2026-2027", "abc", "a@yale.edu")).toBe("seasons/2026-2027/matches/abc/roster/a@yale.edu");
    expect(paths.team("2026-2027", "MC", "1")).toBe("seasons/2026-2027/colleges/MC/teams/1");
  });
  it("refuses a segment that would change the path's shape", () => {
    expect(() => paths.match("2026-2027", "a/b")).toThrow();
    expect(() => paths.user("")).toThrow();
  });
});

describe("sports order", () => {
  it("is by term, then name", async () => {
    const { sortSports } = await import("@/lib/sports");
    const sports = [
      { name: "Volleyball", term: "spring" as const },
      { name: "Soccer", term: "fall" as const },
      { name: "Broomball", term: "winter" as const },
      { name: "Cornhole", term: "fall" as const },
    ];
    expect(sortSports(sports).map((s) => s.name)).toEqual(["Cornhole", "Soccer", "Broomball", "Volleyball"]);
    expect(sports[0].name).toBe("Volleyball"); // a new array
  });
});

describe("API urls", () => {
  it("encodes each id", async () => {
    const { url } = await import("@/lib/api/core");
    expect(url`/api/seasons/${"2026-2027"}/colleges/${"MC"}/teams/${1}/captains/${"a+b@yale.edu"}`).toBe(
      "/api/seasons/2026-2027/colleges/MC/teams/1/captains/a%2Bb%40yale.edu"
    );
    expect(url`/api/seasons`).toBe("/api/seasons");
  });
});
