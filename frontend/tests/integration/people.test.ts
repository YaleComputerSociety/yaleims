// A college's players and leaders, captains (D42), and the dev's roles page.
import { beforeAll, describe, expect, it } from "vitest";
import { api, db, people, seasons, sessionFor, setGlobalRoles } from "./helpers";

let current: string, previous: string;
beforeAll(async () => {
  ({ current, previous } = await seasons());
});
const BF = 0, BK = 1;
const rep = (college = BF) => sessionFor(people.student(college, 0)); // the seed's reps; the cookie claims no role
const player = () => sessionFor(people.student(BF, 6));
const admin = () => sessionFor(people.admin);

describe("GET …/colleges/{c}/players", () => {
  const list = (college: string, session?: string, season = current) => api("GET", `/api/seasons/${season}/colleges/${college}/players`, undefined, { session });

  it("is for the college's rep and captains, supervisors and admins, current season", async () => {
    expect((await list("BF")).status).toBe(401);
    expect((await list("BF", player())).status).toBe(403);
    expect((await list("BK", rep())).status).toBe(403);
    expect((await list("BF", sessionFor(people.student(0, 1)))).status).toBe(200); // a BF captain
    expect((await list("BK", sessionFor(people.student(0, 1)))).status).toBe(403);
    expect((await list("BK", sessionFor(people.supervisor))).status).toBe(200);
    const adminOnly = people.student(4, 7);
    await setGlobalRoles(adminOnly, ["admin"]);
    expect((await list("BK", sessionFor(adminOnly))).status).toBe(200);
    expect((await list("BF", rep(), previous)).status).toBe(409);
  });
  it("lists the players by name with what they captain", async () => {
    const r = await list("BF", rep());
    expect(r.status).toBe(200);
    const ids = r.body.items.map((p: { id: string }) => p.id);
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7]) expect(ids).toContain(people.student(BF, i));
    const names = r.body.items.map((p: { name: string }) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const captain = r.body.items.find((p: { id: string }) => p.id === people.student(BF, 1));
    expect(captain.captainOf).toHaveLength(1);
    expect(r.body.items.find((p: { id: string }) => p.id === people.student(BF, 0)).roles).toEqual(["college_rep"]);
  });
});

describe("GET …/colleges/{c}/leaders", () => {
  it("shows a college's reps and captains to its own players", async () => {
    const path = `/api/seasons/${current}/colleges/BK/leaders`;
    expect((await api("GET", path)).status).toBe(401);
    expect((await api("GET", path, undefined, { session: player() })).status).toBe(403);
    const r = await api("GET", path, undefined, { session: sessionFor(people.student(BK, 6)) });
    expect(r.status).toBe(200);
    // The contact address is the user's email field (the seed's ids happen to be emails too).
    expect(r.body.reps).toEqual([{ playerId: people.student(BK, 0), name: expect.any(String), email: people.student(BK, 0) }]);
    expect(r.body.captains).toHaveLength(2);
    expect(r.body.captains[0]).toEqual({ sportId: expect.any(String), name: expect.any(String) });
  });
});

describe("PUT and DELETE …/colleges/{c}/teams/{sportId}/captains/{userId}", () => {
  const path = (college: string, userId: string, sport = "1", season = current) =>
    `/api/seasons/${season}/colleges/${college}/teams/${sport}/captains/${encodeURIComponent(userId)}`;
  const captains = async (college: string, sport = "1") =>
    (await db.doc(`seasons/${current}/colleges/${college}/teams/${sport}`).get()).data()?.captainIds ?? [];

  it("lets the rep assign and remove their own college's captains", async () => {
    const target = people.student(BF, 5);
    expect((await api("PUT", path("BF", target), undefined, { session: rep() })).status).toBe(204);
    expect(await captains("BF")).toContain(target);
    expect((await api("PUT", path("BF", target), undefined, { session: rep() })).status).toBe(204);
    expect((await api("DELETE", path("BF", target), undefined, { session: rep() })).status).toBe(204);
    expect(await captains("BF")).not.toContain(target);
    const log = await db.collection(`seasons/${current}/auditLog`).where("action", "==", "assignCaptain").where("actor.userId", "==", people.student(BF, 0)).get();
    expect(log.docs.some((d) => d.data().params.userId === target)).toBe(true);
  });
  it("refuses players, other colleges' reps and other colleges' players", async () => {
    expect((await api("PUT", path("BF", people.student(BF, 5)))).status).toBe(401);
    expect((await api("PUT", path("BF", people.student(BF, 5)), undefined, { session: player() })).status).toBe(403);
    expect((await api("PUT", path("BK", people.student(BK, 5)), undefined, { session: rep() })).status).toBe(403);
    expect((await api("PUT", path("BF", people.student(BK, 5)), undefined, { session: rep() })).status).toBe(400);
    expect(await captains("BK")).not.toContain(people.student(BK, 5));
  });
  it("lets an admin change any college's captains; 404 for an unknown sport or person; current season only", async () => {
    expect((await api("PUT", path("BK", people.student(BK, 5), "2"), undefined, { session: admin() })).status).toBe(204);
    expect(await captains("BK", "2")).toContain(people.student(BK, 5));
    expect((await api("DELETE", path("BK", people.student(BK, 5), "2"), undefined, { session: admin() })).status).toBe(204);
    expect((await api("PUT", path("BK", people.student(BK, 5), "99"), undefined, { session: admin() })).status).toBe(404);
    expect((await api("PUT", path("BK", "nobody@example.edu"), undefined, { session: admin() })).status).toBe(404);
    expect((await api("PUT", path("BK", people.student(BK, 5), "1", previous), undefined, { session: admin() })).status).toBe(409);
  });
});

describe("the roles page (devs)", () => {
  it("lists who holds a global role, with their season", async () => {
    expect((await api("GET", "/api/users?role=admin", undefined, { session: player() })).status).toBe(403);
    expect((await api("GET", "/api/users?role=boss", undefined, { session: admin() })).status).toBe(400);
    const r = await api("GET", "/api/users?role=dev", undefined, { session: admin() });
    expect(r.status).toBe(200);
    const dev = r.body.items.find((u: { id: string }) => u.id === people.admin);
    expect(dev).toMatchObject({ email: people.admin, roles: ["admin", "dev"], player: { collegeId: "BF" }, captainOf: [] });
  });
  it("sets a user's global and season roles and captaincies", async () => {
    const target = people.student(BK, 6);
    const set = (body: unknown, email = target, session = admin()) => api("PUT", `/api/users/${encodeURIComponent(email)}/roles`, body, { session });
    expect((await set({ roles: ["college_rep"], captainOf: [] }, target, rep())).status).toBe(403);
    expect((await set({ roles: ["college_rep"], captainOf: ["99"] })).status).toBe(400);
    expect((await set({ roles: ["boss"], captainOf: [] })).status).toBe(400);
    expect((await set({ roles: [], captainOf: [] }, "nobody@example.edu")).status).toBe(404);
    expect((await set({ roles: ["college_rep"], captainOf: [] }, "alum03@example.edu")).status).toBe(409);

    expect((await set({ roles: ["admin", "college_rep"], captainOf: ["1"] })).status).toBe(204);
    expect((await db.doc(`users/${target}`).get()).data()!.roles).toEqual(["admin"]);
    expect((await db.doc(`seasons/${current}/players/${target}`).get()).data()!.roles).toEqual(["college_rep"]);
    expect((await db.doc(`seasons/${current}/colleges/BK/teams/1`).get()).data()!.captainIds).toContain(target);

    expect((await set({ roles: [], captainOf: [] })).status).toBe(204);
    expect((await db.doc(`users/${target}`).get()).data()!.roles).toEqual([]);
    expect((await db.doc(`seasons/${current}/colleges/BK/teams/1`).get()).data()!.captainIds).not.toContain(target);
  });
});
