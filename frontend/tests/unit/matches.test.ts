import { describe, expect, it } from "vitest";
import { encodeCursor, seasonMatchesQuerySchema } from "@/lib/api/matches";

describe("the season matches query in cursor mode", () => {
  it("parses limit, the cursor and the id lists", () => {
    const query = seasonMatchesQuerySchema.parse({ limit: "40", after: "1760000000000|g12", collegeIds: "BK,MC", sportIds: "1,2" });
    expect(query).toMatchObject({ limit: 40, after: { startsAtMs: 1760000000000, id: "g12" }, collegeIds: ["BK", "MC"], sportIds: ["1", "2"] });
  });
  it("reads back the cursor it hands out", () => {
    const cursor = { startsAtMs: 1760000000000, id: "0Ab-_cD" };
    expect(seasonMatchesQuerySchema.parse({ limit: "1", after: encodeCursor(cursor) }).after).toEqual(cursor);
  });
  it("refuses mixed modes, mixed filters and bad values", () => {
    const bad = [
      { page: "1", limit: "5" },
      { after: "1|a" },
      { collegeIds: "BK" },
      { sportIds: "1" },
      { limit: "5", collegeId: "BK", collegeIds: "MC" },
      { limit: "5", sportId: "1", sportIds: "1" },
      { limit: "0" },
      { limit: "101" },
      { limit: "5", after: "yesterday" },
      { limit: "5", after: "12|a/b" },
      { limit: "5", collegeIds: "" },
      { limit: "5", collegeIds: "BK,XX" },
      { limit: "5", sportIds: Array(31).fill("1").join(",") },
    ];
    for (const query of bad) expect(seasonMatchesQuerySchema.safeParse(query).success, JSON.stringify(query)).toBe(false);
  });
});
