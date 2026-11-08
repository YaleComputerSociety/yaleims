// Signing in and out, the session, and the caller's own things (/api/me).
import { beforeAll, describe, expect, it } from "vitest";
import { COLLEGES } from "@/lib/colleges";
import { BASE, api, db, people, seasons, sessionFor } from "./helpers";

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
    const { name, username } = (await db.doc(`users/${id}`).get()).data()!;
    expect(name).not.toBe("Test User"); // the cookie's
    expect(player.body).toEqual({
      signedIn: true,
      viewer: {
        userId: id, email: id, name, canEditName: false, directory: null, username, collegeId: COLLEGES[2].id, roles: [], captainOf: [],
        can: { editSchedule: false, score: false, takeAttendance: false, setChampion: false, manageRoles: false, managePeople: false },
      },
    });
    const rep = await api("GET", "/api/auth/session", undefined, { session: sessionFor(people.student(2, 0), []) });
    expect(rep.body.viewer.roles).toEqual(["college_rep"]);
    const captain = await api("GET", "/api/auth/session", undefined, { session: sessionFor(people.student(2, 1)) });
    expect(captain.body.viewer.captainOf).toHaveLength(1);
    const admin = await api("GET", "/api/auth/session", undefined, { session: sessionFor(people.admin) });
    expect(admin.body.viewer.roles).toEqual(["admin", "dev"]);
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

describe("PATCH /api/me (username)", () => {
  const rename = (username: unknown, session?: string) => api("PATCH", "/api/me", { username }, { session });
  it("checks the username's form and that it's free", async () => {
    const me = sessionFor(people.student(6, 6));
    expect((await rename("NewName")).status).toBe(401);
    expect(await rename("ab", me)).toMatchObject({ status: 400, body: { error: { message: "username: Username must be between 3 and 20 characters long" } } });
    expect((await rename("has space", me)).status).toBe(400);
    const taken = (await db.doc(`users/${people.student(6, 5)}`).get()).data()!.username;
    expect((await rename(taken, me)).status).toBe(409);
  });
  it("renames, freeing the old username", async () => {
    const email = people.student(6, 6);
    const old = (await db.doc(`users/${email}`).get()).data()!.username;
    expect((await rename(" Fresh_Name_1 ", sessionFor(email))).status).toBe(204);
    expect((await db.doc(`users/${email}`).get()).data()!.username).toBe("Fresh_Name_1");
    expect((await db.doc("usernames/Fresh_Name_1").get()).data()).toEqual({ userId: email });
    expect((await db.doc(`usernames/${old}`).get()).exists).toBe(false);
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
