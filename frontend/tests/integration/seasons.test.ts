// GET /api/seasons, GET and PATCH /api/seasons/{seasonId}.
import { beforeAll, describe, expect, it } from "vitest";
import { easternDate, mondayOf } from "@/lib/dates";
import { api, db, people, seasons, sessionFor, setGlobalRoles } from "./helpers";

let current: string, previous: string;
beforeAll(async () => {
  ({ current, previous } = await seasons());
});

describe("GET /api/seasons", () => {
  it("lists every season, oldest first, and the current one (public)", async () => {
    const r = await api("GET", "/api/seasons", undefined, { origin: null });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ total: 2, currentSeasonId: current });
    expect(r.body.items.map((s: { id: string }) => s.id)).toEqual([previous, current]);
    expect(r.body.items[0].championshipUpdatedAt).toMatch(/^\d{4}-\d\d-\d\dT/); // timestamps as ISO strings
  });
});

describe("GET /api/seasons/{seasonId}", () => {
  it("has the season's sports in display order and MVP week 1", async () => {
    const r = await api("GET", `/api/seasons/${current}`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id: current, label: current, celebrationActive: false });
    const sports = r.body.sports as { id: string; name: string; term: string }[];
    expect(sports).toHaveLength(15);
    expect(sports.slice(0, 3).map((s) => s.name)).toEqual(["Cornhole", "Flag Football", "Pickleball"]);
    expect(sports.map((s) => s.term).indexOf("spring")).toBeGreaterThan(sports.map((s) => s.term).lastIndexOf("winter"));
    const first = (await db.collection(`seasons/${current}/matches`).orderBy("startsAt").limit(1).get()).docs[0].data().startsAt.toDate();
    expect(r.body.mvpWeekOne).toBe(mondayOf(easternDate(first)));
  });
  it("is 404 for a season that doesn't exist", async () => {
    expect(await api("GET", "/api/seasons/1999-2000")).toMatchObject({ status: 404, body: { error: { code: "not-found" } } });
  });
});

describe("PATCH /api/seasons/{seasonId} (the champion)", () => {
  const crown = (season: string, body: unknown, session?: string) => api("PATCH", `/api/seasons/${season}`, body, { session });
  const banner = { championCollegeId: "MC", celebrationActive: true };

  it("is for admins only", async () => {
    expect((await crown(current, banner)).status).toBe(401);
    expect((await crown(current, banner, sessionFor(people.student(0, 0), ["user", "admin"]))).status).toBe(403);
    const devOnly = people.student(2, 7);
    await setGlobalRoles(devOnly, ["dev"]);
    expect((await crown(current, banner, sessionFor(devOnly))).status).toBe(403);
  });
  it("works on the current season only", async () => {
    expect(await crown(previous, banner, sessionFor(people.admin))).toMatchObject({ status: 409, body: { error: { code: "conflict" } } });
  });
  it("refuses a celebration without a champion, and unknown fields", async () => {
    const admin = sessionFor(people.admin);
    expect(await crown(current, { championCollegeId: null, celebrationActive: true }, admin)).toMatchObject({ status: 400, body: { error: { code: "bad-request" } } });
    expect((await crown(current, { ...banner, championCollegeId: "XX" }, admin)).status).toBe(400);
    expect((await crown(current, { ...banner, extra: 1 }, admin)).status).toBe(400);
  });
  it("sets the banner and logs it", async () => {
    expect((await crown(current, banner, sessionFor(people.admin))).status).toBe(204);
    expect((await db.doc(`seasons/${current}`).get()).data()).toMatchObject(banner);
    const log = await db.collection(`seasons/${current}/auditLog`).where("action", "==", "setChampion").get();
    expect(log.docs.map((d) => d.data().actor.userId)).toContain(people.admin);
    expect((await crown(current, { championCollegeId: null, celebrationActive: false }, sessionFor(people.admin))).status).toBe(204);
  });
});
