// The security hotfix (D42): the cross-site write guard (proxy.ts), who may
// change captains and name MVPs, and MVP week 1. Ported from the emulator
// suite; step 4 of Phase 2D moves the calls to the new routes.
import { beforeAll, describe, expect, it } from "vitest";
import { api, db, people, sessionFor } from "./helpers";

let season: string;
beforeAll(async () => {
  season = (await db.doc("config/app").get()).data()!.currentSeasonId;
});

describe("cross-site write guard", () => {
  const report = () => ({ matchId: "x", season, reason: "test" });
  it("refuses a write without an Origin", async () => {
    const r = await api("POST", "/api/functions/reportScore", report(), { origin: null });
    expect(r.status).toBe(403);
  });
  it("refuses a write from another site", async () => {
    const r = await api("POST", "/api/functions/reportScore", report(), { origin: "https://evil.example" });
    expect(r).toMatchObject({ status: 403, body: { error: { code: "forbidden", message: "Cross-site request refused" } } });
  });
  it("lets our own pages' writes through", async () => {
    expect((await api("POST", "/api/functions/reportScore", report())).status).toBe(401); // past the guard; no session
  });
  it("needs no Origin for reads", async () => {
    expect((await api("GET", "/api/functions/getSeasons", undefined, { origin: null })).status).toBe(200);
  });
});

describe("captains: the college's rep or an admin (D42)", () => {
  const BF = 0, BK = 1;
  const rep = () => sessionFor(people.student(BF, 0), ["user", "college_rep"]);
  const captain = (email: string, session: string, assign = true) =>
    api("POST", "/api/functions/assignRemoveCaptain", { email, sport: "Soccer", ...(assign ? { assign: true } : { remove: true }) }, { session });
  const captainIds = async (college: string) =>
    (await db.doc(`seasons/${season}/colleges/${college}/teams/1`).get()).data()?.captainIds ?? [];

  it("refuses a player, and a session that only claims the rep role", async () => {
    expect((await captain(people.student(BF, 5), sessionFor(people.student(BF, 6)))).status).toBe(403);
    expect((await captain(people.student(BF, 5), sessionFor(people.student(BF, 6), ["user", "college_rep"]))).status).toBe(403);
  });
  it("refuses a rep for another college's player", async () => {
    expect((await captain(people.student(BK, 5), rep())).status).toBe(403);
    expect(await captainIds("BK")).not.toContain(people.student(BK, 5));
  });
  it("lets the rep assign and remove their own college's captains", async () => {
    expect((await captain(people.student(BF, 5), rep())).status).toBe(200);
    expect(await captainIds("BF")).toContain(people.student(BF, 5));
    expect((await captain(people.student(BF, 5), rep(), false)).status).toBe(200);
    expect(await captainIds("BF")).not.toContain(people.student(BF, 5));
  });
  it("lets an admin change any college's captains", async () => {
    const admin = sessionFor(people.admin, ["user", "admin", "dev"]);
    expect((await captain(people.student(BK, 5), admin)).status).toBe(200);
    expect((await captain(people.student(BK, 5), admin, false)).status).toBe(200);
  });
});

describe("MVPs: the college's own rep or an admin (D42)", () => {
  const BF = 0, BK = 1;
  const mvp = (college: string, email: string, session: string) =>
    api("POST", "/api/functions/setMVP", { season, weekId: "week_40", residentialCollege: college, mvpEmail: email, mvpFName: "A", mvpLName: "B" }, { session });
  const awarded = async (college: string) =>
    (await db.collection(`seasons/${season}/colleges/${college}/mvps`).where("week", "==", 40).get()).docs.map((d) => d.data().playerId);

  it("refuses a player, a claimed-only rep, and a rep for another college", async () => {
    expect((await mvp("BF", people.student(BF, 5), sessionFor(people.student(BF, 6)))).status).toBe(403);
    expect((await mvp("BF", people.student(BF, 5), sessionFor(people.student(BF, 6), ["user", "college_rep"]))).status).toBe(403);
    expect((await mvp("BK", people.student(BK, 5), sessionFor(people.student(BF, 0), ["user", "college_rep"]))).status).toBe(403);
    expect(await awarded("BK")).toEqual([]);
  });
  it("lets the rep name their own college's MVP, and an admin any college's", async () => {
    expect((await mvp("BF", people.student(BF, 5), sessionFor(people.student(BF, 0), ["user", "college_rep"]))).status).toBe(200);
    expect(await awarded("BF")).toEqual([people.student(BF, 5)]);
    expect((await mvp("BK", people.student(BK, 5), sessionFor(people.admin, ["user", "admin", "dev"]))).status).toBe(200);
    expect(await awarded("BK")).toEqual([people.student(BK, 5)]);
  });
});

describe("MVP week 1", () => {
  it("is the Monday of the season's first game's week", async () => {
    const first = (await db.collection(`seasons/${season}/matches`).orderBy("startsAt").limit(1).get()).docs[0].data().startsAt.toDate();
    const { mondayOf, easternDate } = await import("@/lib/dates");
    const r = await api("GET", "/api/functions/getSeasons");
    expect(r.body.current.mvpWeekOne).toBe(mondayOf(easternDate(first)));
  });
});
