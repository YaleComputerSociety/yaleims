// A season's games (list, schedule upload, edit, result) and the played
// games of every season (/api/matches).
import { beforeAll, describe, expect, it } from "vitest";
import { api, db, people, seasons, sessionFor } from "./helpers";

let current: string, previous: string;
beforeAll(async () => {
  ({ current, previous } = await seasons());
});
const admin = () => sessionFor(people.admin);
const player = () => sessionFor(people.student(3, 6));
const ids = (body: { items: { id: string }[] }) => body.items.map((m) => m.id);

describe("GET /api/seasons/{s}/matches", () => {
  it("returns the whole season without a page, with no emails", async () => {
    const r = await api("GET", `/api/seasons/${current}/matches`, undefined, { origin: null });
    expect(r.status).toBe(200);
    const stored = await db.collection(`seasons/${current}/matches`).count().get();
    expect(r.body.total).toBe(stored.data().count);
    expect(r.body.items).toHaveLength(r.body.total);
    const scored = r.body.items.find((m: { status: string }) => m.status === "final");
    expect(scored).not.toHaveProperty("scoredBy");
    expect(scored.startsAt).toMatch(/Z$/);
    expect(scored.result).toHaveProperty("outcome");
  });
  it("filters by college, sport, status and time, in either order", async () => {
    const from = new Date().toISOString();
    const r = await api("GET", `/api/seasons/${current}/matches?collegeId=MC&status=scheduled&from=${from}&order=desc`);
    expect(r.status).toBe(200);
    expect(r.body.total).toBeGreaterThan(0);
    for (const m of r.body.items) {
      expect(m.collegeIds).toContain("MC");
      expect(m.status).toBe("scheduled");
      expect(m.startsAt >= from).toBe(true);
    }
    const starts = r.body.items.map((m: { startsAt: string }) => m.startsAt);
    expect(starts).toEqual([...starts].sort().reverse());
    const soccer = await api("GET", `/api/seasons/${previous}/matches?sportId=1`);
    expect(soccer.body.items.every((m: { sportId: string }) => m.sportId === "1")).toBe(true);
  });
  it("pages: page n of the same filtered list, with the filtered total", async () => {
    const all = await api("GET", `/api/seasons/${current}/matches?collegeId=BK`);
    const page2 = await api("GET", `/api/seasons/${current}/matches?collegeId=BK&page=2&pageSize=5`);
    expect(page2.body.total).toBe(all.body.total);
    expect(ids(page2.body)).toEqual(ids(all.body).slice(5, 10));
  });
  it("refuses bad parameters", async () => {
    for (const query of ["pageSize=101", "page=0", "collegeId=XX", "order=up", "from=yesterday", "colour=red"]) {
      expect((await api("GET", `/api/seasons/${current}/matches?${query}`)).status).toBe(400);
    }
  });
});

describe("GET /api/matches (played games, every season)", () => {
  it("needs a session", async () => {
    expect(await api("GET", "/api/matches")).toMatchObject({ status: 401, body: { error: { code: "unauthenticated" } } });
  });
  it("pages through both seasons' played games, newest first", async () => {
    const stored = async (season: string) =>
      (await db.collection(`seasons/${season}/matches`).where("status", "==", "final").count().get()).data().count;
    const page1 = await api("GET", "/api/matches?pageSize=50", undefined, { session: player() });
    const page2 = await api("GET", "/api/matches?pageSize=50&page=2", undefined, { session: player() });
    const both = await api("GET", "/api/matches?pageSize=100", undefined, { session: player() });
    expect(page1.body.total).toBe((await stored(current)) + (await stored(previous)));
    expect([...ids(page1.body), ...ids(page2.body)]).toEqual(ids(both.body));
    const starts = both.body.items.map((m: { startsAt: string }) => m.startsAt);
    expect(starts).toEqual([...starts].sort().reverse());
    expect(new Set(both.body.items.map((m: { status: string }) => m.status))).toEqual(new Set(["final"]));
    const lastPage = await api("GET", `/api/matches?pageSize=100&page=${Math.ceil(page1.body.total / 100)}`, undefined, { session: player() });
    expect(lastPage.body.items.some((m: { seasonId: string }) => m.seasonId === previous)).toBe(true);
  });
  it("filters by college and time", async () => {
    const recent = (await db.collection(`seasons/${current}/matches`).where("status", "==", "final").orderBy("startsAt", "desc").limit(1).get()).docs[0].data();
    const college = recent.homeCollegeId;
    const from = new Date(recent.startsAt.toMillis() - 24 * 3600 * 1000).toISOString();
    const r = await api("GET", `/api/matches?collegeId=${college}&from=${from}`, undefined, { session: player() });
    expect(r.body.total).toBeGreaterThan(0);
    expect(r.body.items.every((m: { collegeIds: string[]; startsAt: string }) => m.collegeIds.includes(college) && m.startsAt >= from)).toBe(true);
  });
});

describe("POST /api/seasons/{s}/matches (schedule upload)", () => {
  const game = (startsAt: string, home = "BF", away = "BK") => ({ startsAt, homeCollegeId: home, awayCollegeId: away, venue: "Lanman Center", venueDetail: null });
  const upload = (body: unknown, session?: string) => api("POST", `/api/seasons/${current}/matches`, body, { session });
  const soon = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString();

  it("is for admins and devs", async () => {
    const body = { sportId: "1", matches: [game(soon)] };
    expect((await upload(body)).status).toBe(401);
    expect((await upload(body, player())).status).toBe(403);
    expect((await upload(body, sessionFor(people.supervisor, ["user", "supervisor", "admin"]))).status).toBe(403);
  });
  it("refuses unknown sports and colleges, and non-JSON bodies", async () => {
    expect(await upload({ sportId: "99", matches: [game(soon)] }, admin())).toMatchObject({ status: 400, body: { error: { message: "No such sport this season." } } });
    const bad = await upload({ sportId: "1", matches: [game(soon), game(soon, "BF", "XX")] }, admin());
    expect(bad).toMatchObject({ status: 400, body: { error: { code: "bad-request" } } });
    expect(bad.body.error.message).toContain("matches.1.awayCollegeId");
    const res = await fetch(`${process.env.BASE}/api/seasons/${current}/matches`, {
      method: "POST", headers: { origin: process.env.BASE!, cookie: `token=${admin()}`, "Content-Type": "text/plain" }, body: "{}",
    });
    expect(res.status).toBe(400);
  });
  it("adds the games with the sport's points and logs it", async () => {
    const r = await upload({ sportId: "2", matches: [game(soon, "PC", "SY"), game(soon, "SM", "TD")] }, admin());
    expect(r.status).toBe(201);
    expect(r.body.matchIds).toHaveLength(2);
    const doc = (await db.doc(`seasons/${current}/matches/${r.body.matchIds[0]}`).get()).data()!;
    expect(doc).toMatchObject({ sportId: "2", homeCollegeId: "PC", awayCollegeId: "SY", collegeIds: ["PC", "SY"], pointsForWin: 6, status: "scheduled", venue: "Lanman Center", venueDetail: null, stage: "regular" });
    expect(doc.startsAt.toDate().toISOString()).toBe(soon);
    const log = await db.collection(`seasons/${current}/auditLog`).where("action", "==", "addSchedule").where("actor.userId", "==", people.admin).get();
    expect(log.docs.some((d) => d.data().targets.includes(`seasons/${current}/matches/${r.body.matchIds[1]}`))).toBe(true);
  });
});

describe("PATCH /api/seasons/{s}/matches/{m}", () => {
  const edit = (matchId: string, body: unknown, session?: string) => api("PATCH", `/api/seasons/${current}/matches/${matchId}`, body, { session });

  it("is for admins and devs; 404 for an unknown game", async () => {
    expect((await edit("nope", { venue: "X" }, player())).status).toBe(403);
    expect((await edit("nope", { venue: "X" }, admin())).status).toBe(404);
  });
  it("reschedules a game and its roster entries", async () => {
    const entries = await db.collectionGroup("roster").where("seasonId", "==", current).get();
    const entry = entries.docs.map((d) => d.data()).find((e) => e.startsAt.toMillis() > Date.now())!;
    const later = new Date(entry.startsAt.toMillis() + 3600 * 1000).toISOString();
    expect((await edit(entry.matchId, { startsAt: later, venue: "Payne Whitney Gym", venueDetail: null }, admin())).status).toBe(204);
    const game = (await db.doc(`seasons/${current}/matches/${entry.matchId}`).get()).data()!;
    expect(game.venue).toBe("Payne Whitney Gym");
    expect(game.startsAt.toDate().toISOString()).toBe(later);
    const moved = (await db.doc(`seasons/${current}/matches/${entry.matchId}/roster/${entry.playerId}`).get()).data()!;
    expect(moved.startsAt.toDate().toISOString()).toBe(later);
  });
  it("won't change a scored game's colleges", async () => {
    const scored = (await db.collection(`seasons/${current}/matches`).where("status", "==", "final").limit(1).get()).docs[0];
    const other = ["BF", "BK"].find((c) => !scored.data().collegeIds.includes(c))!;
    expect(await edit(scored.id, { homeCollegeId: other }, admin())).toMatchObject({ status: 409, body: { error: { code: "conflict" } } });
  });
});

describe("PUT and DELETE /api/seasons/{s}/matches/{m}/result", () => {
  const result = { homeScore: 3, awayScore: 1, homeForfeit: false, awayForfeit: false };
  const points = async (college: string) => (await db.doc(`seasons/${current}/colleges/${college}`).get()).data()!.points;

  it("scores a game, refuses a second score, and undoes it", async () => {
    const game = (await db.collection(`seasons/${current}/matches`).where("status", "==", "scheduled").where("stage", "==", "regular").where("startsAt", "<", new Date()).limit(1).get()).docs[0];
    const { homeCollegeId: home, pointsForWin } = game.data();
    const path = `/api/seasons/${current}/matches/${game.id}/result`;
    expect((await api("PUT", path, result, { session: player() })).status).toBe(403);
    expect((await api("PUT", path, { ...result, homeScore: -1 }, { session: admin() })).status).toBe(400);
    const before = await points(home);

    expect((await api("PUT", path, result, { session: admin() })).status).toBe(204);
    expect(await points(home)).toBe(before + pointsForWin);
    const scored = (await game.ref.get()).data()!;
    expect(scored).toMatchObject({ status: "final", result: { homeScore: 3, awayScore: 1, outcome: "home", forfeit: false }, scoredBy: people.admin });
    expect((await api("PUT", path, result, { session: admin() })).status).toBe(409);

    expect((await api("DELETE", path, undefined, { session: admin() })).status).toBe(204);
    expect(await points(home)).toBe(before);
    expect((await game.ref.get()).data()).toMatchObject({ status: "scheduled", result: null });
    expect((await api("DELETE", path, undefined, { session: admin() })).status).toBe(409);
  });
  it("is 404 for an unknown game", async () => {
    expect((await api("PUT", `/api/seasons/${current}/matches/nope/result`, result, { session: admin() })).status).toBe(404);
  });
});
