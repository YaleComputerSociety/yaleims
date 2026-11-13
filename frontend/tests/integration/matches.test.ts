// A season's games (list, schedule upload, edit, result) and its played
// games (/api/matches, current season by default).
import { beforeAll, describe, expect, it } from "vitest";
import { api, db, people, seasons, sessionFor } from "./helpers";

let current: string, previous: string;
beforeAll(async () => {
  ({ current, previous } = await seasons());
});
const admin = () => sessionFor(people.admin);
const player = () => sessionFor(people.student(3, 6));
const ids = (body: { items: { id: string }[] }) => body.items.map((m) => m.id);
/** A signed-in GET (D45: the games are for signed-in users). */
const get = (path: string) => api("GET", path, undefined, { session: player() });

describe("GET /api/seasons/{s}/matches", () => {
  it("needs a session (D45)", async () => {
    expect(await api("GET", `/api/seasons/${current}/matches`)).toMatchObject({ status: 401, body: { error: { code: "unauthenticated" } } });
    expect((await api("GET", `/api/seasons/${current}/matches?limit=5`)).status).toBe(401);
  });
  it("returns the whole season without a page, with no emails", async () => {
    const r = await api("GET", `/api/seasons/${current}/matches`, undefined, { origin: null, session: player() });
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
    const r = await get(`/api/seasons/${current}/matches?collegeId=MC&status=scheduled&from=${from}&order=desc`);
    expect(r.status).toBe(200);
    expect(r.body.total).toBeGreaterThan(0);
    for (const m of r.body.items) {
      expect(m.collegeIds).toContain("MC");
      expect(m.status).toBe("scheduled");
      expect(m.startsAt >= from).toBe(true);
    }
    const starts = r.body.items.map((m: { startsAt: string }) => m.startsAt);
    expect(starts).toEqual([...starts].sort().reverse());
    const soccer = await get(`/api/seasons/${previous}/matches?sportId=1`);
    expect(soccer.body.items.every((m: { sportId: string }) => m.sportId === "1")).toBe(true);
  });
  it("pages: page n of the same filtered list, with the filtered total", async () => {
    const all = await get(`/api/seasons/${current}/matches?collegeId=BK`);
    const page2 = await get(`/api/seasons/${current}/matches?collegeId=BK&page=2&pageSize=5`);
    expect(page2.body.total).toBe(all.body.total);
    expect(ids(page2.body)).toEqual(ids(all.body).slice(5, 10));
  });
  it("refuses bad parameters", async () => {
    for (const query of ["pageSize=101", "page=0", "collegeId=XX", "order=up", "from=yesterday", "colour=red"]) {
      expect((await get(`/api/seasons/${current}/matches?${query}`)).status).toBe(400);
    }
  });

  // Cursor mode: every page of `query`, `limit` games each, following `next`.
  const walk = async (query: string, limit: number) => {
    const pages: string[][] = [];
    let after: string | null = null;
    do {
      const r = await get(`/api/seasons/${current}/matches?${query}&limit=${limit}${after ? `&after=${after}` : ""}`);
      expect(r.status).toBe(200);
      expect(r.body.items.length).toBeLessThanOrEqual(limit);
      pages.push(ids(r.body));
      after = r.body.next;
    } while (after);
    return pages;
  };
  it("pages by cursor: full pages that tile the filtered list, in either order; the last page has no next", async () => {
    for (const order of ["asc", "desc"]) {
      const all = await get(`/api/seasons/${current}/matches?collegeId=BK&order=${order}`);
      const pages = await walk(`collegeId=BK&order=${order}`, 5);
      expect(pages.flat()).toEqual(ids(all.body));
      expect(pages.length).toBeGreaterThan(1);
      expect(pages.slice(0, -1).every((p) => p.length === 5)).toBe(true);
    }
  });
  it("continues after a cursor that sits inside a run of games starting at the same minute", async () => {
    const all = (await get(`/api/seasons/${current}/matches`)).body.items as { id: string; startsAt: string }[];
    const i = all.findIndex((m, k) => k > 0 && m.startsAt === all[k - 1].startsAt);
    expect(i).toBeGreaterThan(0); // the seed schedules games at the same time
    const before = all[i - 1];
    const r = await get(`/api/seasons/${current}/matches?limit=3&after=${Date.parse(before.startsAt)}|${before.id}`);
    expect(ids(r.body)).toEqual(all.slice(i, i + 3).map((m) => m.id));
  });
  it("lists the games of any favorite college or sport together, each once, in order", async () => {
    const all = (await get(`/api/seasons/${current}/matches`)).body.items as { id: string; sportId: string; collegeIds: string[]; status: string }[];
    const colleges = ["BK", "MC"], sports = ["1"];
    const wanted = all.filter((m) => m.collegeIds.some((c) => colleges.includes(c)) || sports.includes(m.sportId));
    expect(wanted.length).toBeGreaterThan(7);
    expect(wanted.some((m) => m.collegeIds.includes("BK") && m.sportId === "1")).toBe(true); // in both lists: once
    const favorites = `collegeIds=${colleges.join(",")}&sportIds=${sports.join(",")}`;
    expect((await walk(favorites, 7)).flat()).toEqual(wanted.map((m) => m.id));
    // A single filter narrows both lists; one list alone works too.
    expect((await walk(`${favorites}&status=scheduled`, 50)).flat()).toEqual(wanted.filter((m) => m.status === "scheduled").map((m) => m.id));
    expect((await walk(`sportIds=1`, 50)).flat()).toEqual(all.filter((m) => m.sportId === "1").map((m) => m.id));
  });
  it("refuses bad cursor parameters", async () => {
    const bad = [
      "limit=0", "limit=101", "page=1&limit=5", "after=1|a", "limit=5&after=nope", "collegeIds=BK,MC",
      "limit=5&collegeId=BK&collegeIds=MC", "limit=5&sportId=1&sportIds=1", "limit=5&collegeIds=", `limit=5&collegeIds=${Array(31).fill("BK").join(",")}`,
    ];
    for (const query of bad) expect((await get(`/api/seasons/${current}/matches?${query}`)).status, query).toBe(400);
  });
});

describe("GET /api/matches (played games in one season)", () => {
  const playedCount = async (season: string) =>
    (await db.collection(`seasons/${season}/matches`).where("status", "==", "final").count().get()).data().count;

  it("needs a session", async () => {
    expect(await api("GET", "/api/matches")).toMatchObject({ status: 401, body: { error: { code: "unauthenticated" } } });
  });
  it("pages through only the current season by default, newest first", async () => {
    const options = { session: player() };
    const page1 = await api("GET", "/api/matches?pageSize=20", undefined, options);
    const page2 = await api("GET", "/api/matches?pageSize=20&page=2", undefined, options);
    const both = await api("GET", "/api/matches?pageSize=40", undefined, options);
    expect(page1.status).toBe(200);
    expect(page1.body.total).toBe(await playedCount(current));
    expect(page2.body.total).toBe(page1.body.total);
    expect([...ids(page1.body), ...ids(page2.body)]).toEqual(ids(both.body));
    const starts = both.body.items.map((m: { startsAt: string }) => m.startsAt);
    expect(starts).toEqual([...starts].sort().reverse());
    expect(new Set(both.body.items.map((m: { status: string }) => m.status))).toEqual(new Set(["final"]));
    expect(new Set(both.body.items.map((m: { seasonId: string }) => m.seasonId))).toEqual(new Set([current]));
  });
  it("returns an explicitly selected past season with its own total", async () => {
    const response = await api("GET", `/api/matches?seasonId=${previous}&pageSize=5&order=asc`, undefined, { session: player() });
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(await playedCount(previous));
    expect(response.body.items).toHaveLength(5);
    expect(new Set(response.body.items.map((m: { seasonId: string }) => m.seasonId))).toEqual(new Set([previous]));
    const starts = response.body.items.map((m: { startsAt: string }) => m.startsAt);
    expect(starts).toEqual([...starts].sort());
  });
  it("handles out-of-range pages on both match lists", async () => {
    const options = { session: player() };
    const page = Number.MAX_SAFE_INTEGER;
    const scores = await api("GET", `/api/matches?page=${page}`, undefined, options);
    expect(scores).toMatchObject({ status: 200, body: { items: [], total: await playedCount(current) } });
    const games = await get(`/api/seasons/${current}/matches?page=${page}`);
    const total = (await db.collection(`seasons/${current}/matches`).count().get()).data().count;
    expect(games).toMatchObject({ status: 200, body: { items: [], total } });
  });
  it("rejects a season id that can change the query path", async () => {
    const response = await api("GET", "/api/matches?seasonId=2025-2026%2Fmatches", undefined, { session: player() });
    expect(response).toMatchObject({ status: 400, body: { error: { code: "bad-request" } } });
  });
  it("does not fall back to history when the current season is unset", async () => {
    const config = db.doc("config/app");
    const stored = (await config.get()).data()!;
    try {
      await config.delete();
      const response = await api("GET", "/api/matches", undefined, { session: player() });
      expect(response).toMatchObject({ status: 200, body: { items: [], total: 0 } });
    } finally {
      await config.set(stored);
    }
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

  it("is for supervisors (and admins)", async () => {
    const body = { sportId: "1", matches: [game(soon)] };
    expect((await upload(body)).status).toBe(401);
    // The cookie's roles don't count: only Firestore's.
    expect((await upload(body, sessionFor(people.student(0, 6), ["user", "supervisor", "admin"]))).status).toBe(403);
    expect((await upload(body, sessionFor(people.supervisor))).status).toBe(201);
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
    const other = ["BF", "BK", "BR"].find((c) => !scored.data().collegeIds.includes(c))!;
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
