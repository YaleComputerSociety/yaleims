// Signing in and out, the session, and the caller's own things (/api/me).
import { beforeAll, describe, expect, it } from "vitest";
import { COLLEGES } from "@/lib/colleges";
import { setFakeYalemoji } from "./fakeYalemoji";
import { BASE, api, db, people, seasons, sessionFor, sessionOf } from "./helpers";

let current: string, previous: string;
beforeAll(async () => {
  ({ current, previous } = await seasons());
});

/** A request that doesn't follow redirects; the status, Location and Set-Cookie. */
async function raw(method: string, path: string, { session, origin = BASE }: { session?: string; origin?: string } = {}) {
  const res = await fetch(BASE + path, {
    method, redirect: "manual", headers: { origin, ...(session ? { cookie: `token=${session}` } : {}) },
  });
  return { status: res.status, location: res.headers.get("location"), setCookie: res.headers.get("set-cookie") ?? "" };
}

describe("login", () => {
  it("sends people to Yale CAS, coming back to a page of this site", async () => {
    const r = await raw("GET", "/api/auth/login?from=%2Fgames");
    expect(r.status).toBe(307);
    const cas = new URL(r.location!);
    expect(cas.origin + cas.pathname).toBe("https://secure.its.yale.edu/cas/login");
    const service = new URL(cas.searchParams.get("service")!);
    expect(service.origin + service.pathname).toBe(`${BASE}/api/auth/redirect`);
    expect(service.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(service.searchParams.has("from")).toBe(false);
    expect(r.setCookie).toContain("yims_login=");
  });
  it("back from CAS without a ticket: to CAS again", async () => {
    const r = await raw("GET", "/api/auth/redirect?from=%2Fhub");
    expect(r.status).toBe(307);
    expect(r.location).toContain("https://secure.its.yale.edu/cas/login?service=");
  });
});

describe("GET /api/auth/session", () => {
  it("is signed out without a cookie, and clears an invalid one", async () => {
    expect(await api("GET", "/api/auth/session")).toMatchObject({ status: 200, body: { signedIn: false } });
    const forged = await raw("GET", "/api/auth/session", { session: "not-a-jwt" });
    expect(forged.status).toBe(200);
    expect(forged.setCookie).toMatch(/^token=;/);
  });
  it("reads the name, roles, college and captaincies from Firestore, not the cookie", async () => {
    const id = people.student(2, 6);
    const player = await api("GET", "/api/auth/session", undefined, { session: sessionFor(id, ["user", "admin", "dev"]) });
    const { name } = (await db.doc(`users/${id}`).get()).data()!;
    expect(name).not.toBe("Test User"); // the cookie's
    expect(player.body).toEqual({
      signedIn: true,
      viewer: {
        userId: id, netid: id.split("@")[0], email: id, name, named: true, canEditName: false, directory: null, collegeId: COLLEGES[2].id, roles: [], captainOf: [],
        favorites: { sportIds: [], collegeIds: [] },
        can: { editSchedule: false, score: false, takeAttendance: false, setChampion: false, manageRoles: false, managePeople: false },
      },
    });
    const rep = await api("GET", "/api/auth/session", undefined, { session: sessionFor(people.student(2, 0), []) });
    expect(rep.body.viewer.roles).toEqual(["college_rep"]);
    const captain = await api("GET", "/api/auth/session", undefined, { session: sessionFor(people.student(2, 1)) });
    expect(captain.body.viewer.captainOf).toHaveLength(1);
    const admin = await api("GET", "/api/auth/session", undefined, { session: sessionFor(people.admin) });
    expect(admin.body.viewer.roles).toEqual(["admin", "dev"]);
    // An account the directory couldn't name: the NetID stands in, and `named` says so.
    const unnamed = "netid-zz908";
    await db.doc(`users/${unnamed}`).set({
      email: null, name: null, nameSource: "none", netid: "zz908", roles: [], claimedAt: null, createdBy: null, directory: null,
    });
    try {
      const session = await api("GET", "/api/auth/session", undefined, { session: sessionOf(unnamed, "zz908") });
      expect(session.body.viewer).toMatchObject({ netid: "zz908", name: "zz908", named: false });
    } finally {
      await db.doc(`users/${unnamed}`).delete();
      await db.doc(`seasons/${current}/players/${unnamed}`).delete(); // the visit joined the season
    }
  });
  it("joins a returning student to the current season with the college Yalies gives now, never last season's or the cookie's (D30, decision 5)", async () => {
    const [known, unknown, unreachable] = ["alum05@example.edu", "alum06@example.edu", "alum07@example.edu"];
    const visit = (alum: string, netid: string) =>
      api("GET", "/api/auth/session", undefined, { session: sessionFor(alum, [], { netid, college: "Saybrook College" }) });
    const playerDoc = (season: string, alum: string) => db.doc(`seasons/${season}/players/${alum}`);
    try {
      for (const alum of [known, unknown, unreachable]) expect((await playerDoc(current, alum).get()).exists).toBe(false);
      // The fake directory's zz902 is in Morse; zz909 isn't in it; it can't answer for zz998.
      expect((await visit(known, "zz902")).body.viewer.collegeId).toBe("MC");
      expect((await playerDoc(current, known).get()).data()).toMatchObject({ collegeId: "MC", joinedVia: "login" });
      expect((await playerDoc(previous, known).get()).exists).toBe(true); // last season's stays
      expect((await visit(unknown, "zz909")).body.viewer.collegeId).toBeNull();
      expect((await playerDoc(current, unknown).get()).data()).toMatchObject({ collegeId: null, joinedVia: "login" });
      expect((await visit(unreachable, "zz998")).body.signedIn).toBe(true);
      expect((await playerDoc(current, unreachable).get()).exists).toBe(false); // joins at a later visit
    } finally {
      for (const alum of [known, unknown, unreachable]) await playerDoc(current, alum).delete();
    }
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie; refused from another site", async () => {
    const r = await raw("POST", "/api/auth/logout", { session: sessionFor(people.student(2, 6)) });
    expect(r.status).toBe(204);
    expect(r.setCookie).toMatch(/^token=;/);
    expect((await raw("POST", "/api/auth/logout", { origin: "https://evil.example" })).status).toBe(403);
  });
});

describe("PUT /api/me/favorites", () => {
  const id = people.student(4, 3);
  const put = (body: unknown, session = sessionFor(id)) => api("PUT", "/api/me/favorites", body, { session });
  const mine = async () => (await api("GET", "/api/auth/session", undefined, { session: sessionFor(id) })).body.viewer.favorites;

  it("needs a session", async () => {
    expect((await api("PUT", "/api/me/favorites", { sportIds: [], collegeIds: [] })).status).toBe(401);
  });
  it("replaces the whole value, each id once, and the session shows it", async () => {
    expect(await mine()).toEqual({ sportIds: [], collegeIds: [] });
    expect((await put({ sportIds: ["1", "2", "1"], collegeIds: ["BK"] })).status).toBe(204);
    expect(await mine()).toEqual({ sportIds: ["1", "2"], collegeIds: ["BK"] });
    expect((await put({ sportIds: [], collegeIds: ["MC", "BK"] })).status).toBe(204);
    expect(await mine()).toEqual({ sportIds: [], collegeIds: ["MC", "BK"] });
    expect((await db.doc(`users/${id}`).get()).data()!.favorites).toEqual({ sportIds: [], collegeIds: ["MC", "BK"] });
  });
  it("refuses bad values, and a login without an account", async () => {
    const bad = [
      { sportIds: ["1"] },
      { sportIds: [], collegeIds: ["XX"] },
      { sportIds: [""], collegeIds: [] },
      { sportIds: Array.from({ length: 31 }, (_, i) => String(i)), collegeIds: [] },
      { sportIds: [], collegeIds: [], extra: 1 },
    ];
    for (const body of bad) expect((await put(body)).status, JSON.stringify(body)).toBe(400);
    expect((await put({ sportIds: [], collegeIds: [] }, sessionFor("netid-nobodyhere"))).status).toBe(404);
  });
});

describe("GET /api/me/yalemoji", () => {
  const avatar = (version: number) => ({
    version,
    png_url: `https://storage.example/avatars/opaque/${version}/avatar.png`,
    svg_url: `https://storage.example/avatars/opaque/${version}/avatar.svg`,
    background_url: `https://storage.example/avatars/opaque/${version}/background.svg`,
  });
  const shown = (version: number) => ({ version, pngUrl: avatar(version).png_url, backgroundUrl: avatar(version).background_url });
  // A student per case: the server reuses each person's answer for 5 s (server/yalemoji.ts).
  const student = (position: number) => {
    const id = people.student(4, position);
    const mine = (query = "") => api("GET", `/api/me/yalemoji${query}`, undefined, { session: sessionFor(id) });
    return { id, netid: id.split("@")[0], mine };
  };

  it("needs a session", async () => {
    expect((await api("GET", "/api/me/yalemoji")).status).toBe(401);
  });
  it("is the session's NetID's avatar, never one asked for, and never cached", async () => {
    const { id, netid, mine } = student(5);
    await setFakeYalemoji(netid, avatar(2));
    await setFakeYalemoji("zz902", avatar(7));
    expect((await mine("?netid=zz902")).body).toEqual({ netid, yalemoji: shown(2) });
    const res = await fetch(`${BASE}/api/me/yalemoji`, { headers: { cookie: `token=${sessionFor(id)}` } });
    expect(res.headers.get("cache-control")).toContain("no-store");
    await setFakeYalemoji(netid, null);
  });
  it("is null when they have none, 503 when Yalemoji can't be reached or answers nonsense", async () => {
    const none = student(6);
    expect(await none.mine()).toMatchObject({ status: 200, body: { netid: none.netid, yalemoji: null } });
    const down = student(7);
    await setFakeYalemoji(down.netid, "down");
    expect(await down.mine()).toMatchObject({ status: 503, body: { error: { code: "unavailable" } } });
    const nonsense = student(4);
    await setFakeYalemoji(nonsense.netid, { ...avatar(3), png_url: "javascript:alert(1)" });
    expect((await nonsense.mine()).status).toBe(503);
    await setFakeYalemoji(down.netid, null);
    await setFakeYalemoji(nonsense.netid, null);
  });
  it("reuses a person's answer for a few seconds: requests in a loop don't each reach Yalemoji", async () => {
    const { netid, mine } = student(3);
    await setFakeYalemoji(netid, avatar(2));
    expect((await mine()).body).toEqual({ netid, yalemoji: shown(2) });
    await setFakeYalemoji(netid, "down");
    expect(await Promise.all([mine(), mine()])).toMatchObject([
      { status: 200, body: { yalemoji: shown(2) } },
      { status: 200, body: { yalemoji: shown(2) } },
    ]);
    await setFakeYalemoji(netid, null);
  });
});

describe("GET /api/me/matches", () => {
  it("lists the caller's games that season, by start, upcoming or all", async () => {
    expect((await api("GET", `/api/me/matches?seasonId=${current}`)).status).toBe(401);
    const entries = (await db.collectionGroup("roster").where("seasonId", "==", current).get()).docs.map((d) => d.data());
    const signedUp = entries.find((e) => e.captainStatus === null && e.startsAt.toMillis() > Date.now())!;
    const mine = entries.filter((e) => e.playerId === signedUp.playerId && e.captainStatus !== "removed");
    const session = sessionFor(signedUp.playerId);
    expect((await api("GET", "/api/me/matches", undefined, { session })).status).toBe(400);

    const all = await api("GET", `/api/me/matches?seasonId=${current}`, undefined, { session });
    expect(all.body.total).toBe(mine.length);
    const starts = all.body.items.map((m: { startsAt: string }) => m.startsAt);
    expect(starts).toEqual([...starts].sort());
    const upcoming = await api("GET", `/api/me/matches?seasonId=${current}&upcoming=true`, undefined, { session });
    expect(upcoming.body.items.map((m: { id: string }) => m.id)).toContain(signedUp.matchId);
    expect(upcoming.body.items.every((m: { startsAt: string }) => new Date(m.startsAt).getTime() > Date.now())).toBe(true);
  });
  it("leaves out a game the captain took them off", async () => {
    const removed = (await db.collectionGroup("roster").where("captainStatus", "==", "removed").get()).docs[0].data();
    const r = await api("GET", `/api/me/matches?seasonId=${current}`, undefined, { session: sessionFor(removed.playerId) });
    expect(r.body.items.map((m: { id: string }) => m.id)).not.toContain(removed.matchId);
  });
});
