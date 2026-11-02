import { describe, expect, it } from "vitest";
import { addDays, easternDate, easternMidnight, mondayOf, seasonStart } from "@/lib/dates";

describe("easternDate", () => {
  it("is the day in New York, whatever the machine's time zone", () => {
    expect(easternDate(new Date("2026-09-08T03:30:00Z"))).toBe("2026-09-07"); // 11:30 pm EDT
    expect(easternDate(new Date("2027-01-15T04:59:00Z"))).toBe("2027-01-14"); // 11:59 pm EST
  });
});

describe("mondayOf", () => {
  it("is the Monday of the day's week (weeks run Monday to Sunday)", () => {
    expect(mondayOf("2025-09-10")).toBe("2025-09-08"); // a Wednesday
    expect(mondayOf("2026-09-07")).toBe("2026-09-07"); // a Monday
    expect(mondayOf("2026-09-13")).toBe("2026-09-07"); // a Sunday
    expect(mondayOf("2027-01-01")).toBe("2026-12-28"); // across the year
  });
});

describe("seasonStart", () => {
  it("is July 1 of the start year, midnight Eastern", () => {
    expect(seasonStart(2026).toISOString()).toBe("2026-07-01T04:00:00.000Z");
  });
});

describe("easternMidnight", () => {
  it("is the start of the day in New York, in summer and in winter time", () => {
    expect(easternMidnight("2026-07-01").toISOString()).toBe("2026-07-01T04:00:00.000Z");
    expect(easternMidnight("2026-01-15").toISOString()).toBe("2026-01-15T05:00:00.000Z");
    // The days the clocks change: midnight is still on the old time.
    expect(easternMidnight("2026-11-01").toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(easternMidnight("2026-03-08").toISOString()).toBe("2026-03-08T05:00:00.000Z");
  });
});

describe("addDays", () => {
  it("counts calendar days, across months and years", () => {
    expect(addDays("2026-11-01", -7)).toBe("2026-10-25");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
