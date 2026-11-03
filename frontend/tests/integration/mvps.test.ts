// A college's weekly MVPs: read and named by its rep or an admin (D42).
import { beforeAll, describe, expect, it } from "vitest";
import { api, db, people, seasons, sessionFor } from "./helpers";

let current: string;
beforeAll(async () => {
  ({ current } = await seasons());
});
const BF = 0, BK = 1;
const rep = (college = BF) => sessionFor(people.student(college, 0));

describe("GET …/colleges/{c}/mvps", () => {
  it("is for the college's rep and admins, by week", async () => {
    const path = `/api/seasons/${current}/colleges/BF/mvps`;
    expect((await api("GET", path)).status).toBe(401);
    expect((await api("GET", path, undefined, { session: sessionFor(people.student(BF, 6)) })).status).toBe(403);
    expect((await api("GET", path, undefined, { session: rep(BK) })).status).toBe(403);
    const r = await api("GET", path, undefined, { session: rep() });
    expect(r.status).toBe(200);
    expect(r.body.total).toBeGreaterThan(0);
    const weeks = r.body.items.map((m: { week: number }) => m.week);
    expect(weeks).toEqual([...weeks].sort((a, b) => a - b));
    expect(r.body.items[0]).toMatchObject({ collegeId: "BF", playerId: expect.stringContaining("@"), awardedBy: people.student(BF, 0) });
    expect((await api("GET", `/api/seasons/${current}/colleges/BK/mvps`, undefined, { session: sessionFor(people.admin) })).status).toBe(200);
  });
});

describe("PUT …/colleges/{c}/mvps/{week}", () => {
  const name = (college: string, week: unknown, playerId: string, session: string) =>
    api("PUT", `/api/seasons/${current}/colleges/${college}/mvps/${week}`, { playerId }, { session });
  const awards = async (college: string, week: number) =>
    (await db.collection(`seasons/${current}/colleges/${college}/mvps`).where("week", "==", week).get()).docs.map((d) => d.data());

  it("names one of the college's players, with the name from their player doc, once", async () => {
    const winner = people.student(BF, 4);
    expect((await name("BF", 41, winner, rep())).status).toBe(204);
    expect((await name("BF", 41, winner, rep())).status).toBe(204);
    const stored = await awards("BF", 41);
    const player = (await db.doc(`seasons/${current}/players/${winner}`).get()).data()!;
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ playerId: winner, name: player.name, awardedBy: people.student(BF, 0), seasonId: current, collegeId: "BF" });
  });
  it("refuses another college's player, a bad week, other reps and players", async () => {
    expect((await name("BF", 42, people.student(BK, 4), rep())).status).toBe(400);
    expect((await name("BF", 0, people.student(BF, 4), rep())).status).toBe(400);
    expect((await name("BF", "week_3", people.student(BF, 4), rep())).status).toBe(400);
    expect((await name("BK", 42, people.student(BK, 4), rep())).status).toBe(403);
    expect((await name("BF", 42, people.student(BF, 4), sessionFor(people.student(BF, 6), ["user", "college_rep"]))).status).toBe(403);
    expect(await awards("BF", 42)).toEqual([]);
    expect((await api("PUT", `/api/seasons/${current}/colleges/BF/mvps/42`, { playerId: people.student(BF, 4), name: "X" }, { session: rep() })).status).toBe(400);
  });
  it("lets an admin name any college's MVP", async () => {
    expect((await name("BK", 43, people.student(BK, 4), sessionFor(people.admin))).status).toBe(204);
    expect((await awards("BK", 43)).map((a) => a.playerId)).toEqual([people.student(BK, 4)]);
  });
});
