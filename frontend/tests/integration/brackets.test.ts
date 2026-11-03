// A season's playoffs and tournaments: list, one with its games, create, delete.
import { beforeAll, describe, expect, it } from "vitest";
import { COLLEGES } from "@/lib/colleges";
import { api, db, people, seasons, sessionFor } from "./helpers";

let current: string, previous: string;
beforeAll(async () => {
  ({ current, previous } = await seasons());
});
const admin = () => sessionFor(people.admin);
const player = () => sessionFor(people.student(3, 6));

/** A full first round: slots 2–4 and 8–10 with two colleges each, byes in 1 and 7, later rounds empty. */
function slots(withThirdPlace = false) {
  const ids = COLLEGES.map((c) => c.id);
  const at = new Date(Date.now() + 50 * 24 * 3600 * 1000).toISOString();
  const slot = (n: number, home: string | null = null, away: string | null = null) => ({
    slot: n, homeCollegeId: home, awayCollegeId: away, homeSeed: null, awaySeed: null, division: null, startsAt: at, venue: "Lanman Center", venueDetail: null,
  });
  return [
    slot(1, ids[0]), slot(2, ids[1], ids[2]), slot(3, ids[3], ids[4]), slot(4, ids[5], ids[6]),
    slot(7, ids[7]), slot(8, ids[8], ids[9]), slot(9, ids[10], ids[11]), slot(10, ids[12], ids[13]),
    ...[5, 6, 11, 12, 13, 14, 15, ...(withThirdPlace ? [16] : [])].map((n) => slot(n)),
  ];
}

describe("GET /api/seasons/{s}/brackets", () => {
  it("lists the season's brackets, newest first, by kind (public)", async () => {
    const all = await api("GET", `/api/seasons/${current}/brackets`, undefined, { origin: null });
    expect(all.status).toBe(200);
    expect(all.body.items.map((b: { kind: string }) => b.kind).sort()).toEqual(["playoffs", "tournament"]);
    const created = all.body.items.map((b: { createdAt: string }) => b.createdAt);
    expect(created).toEqual([...created].sort().reverse());
    const tournaments = await api("GET", `/api/seasons/${previous}/brackets?kind=tournament`);
    expect(tournaments.body).toMatchObject({ total: 1, items: [{ kind: "tournament", name: "Spring Volleyball Tournament" }] });
    expect((await api("GET", `/api/seasons/${current}/brackets?kind=cup`)).status).toBe(400);
  });
});

describe("GET /api/seasons/{s}/brackets/{b}", () => {
  it("has the slots (byes without a game) and the games in slot order", async () => {
    const r = await api("GET", `/api/seasons/${previous}/brackets/spring-volleyball-tournament`);
    expect(r.status).toBe(200);
    expect(r.body.slots).toHaveLength(16);
    const byes = r.body.slots.filter((s: { matchId: string | null }) => !s.matchId);
    expect(byes.map((s: { slot: number }) => s.slot)).toEqual([1, 7]);
    expect(byes.every((s: { byeCollegeId: string }) => s.byeCollegeId)).toBe(true);
    expect(r.body.matches).toHaveLength(14);
    expect(r.body.matches.map((m: { bracketSlot: number }) => m.bracketSlot)).toEqual([2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(r.body.placements.first).toBeTruthy(); // played out by the seed
  });
  it("is 404 for an unknown bracket", async () => {
    expect((await api("GET", `/api/seasons/${current}/brackets/nope`)).status).toBe(404);
  });
});

describe("POST and DELETE /api/seasons/{s}/brackets", () => {
  const create = (season: string, body: unknown, session?: string) => api("POST", `/api/seasons/${season}/brackets`, body, { session });
  const playoffs = { kind: "playoffs", sportId: "11", slots: slots() }; // Volleyball: no playoffs this season yet

  it("is for admins and devs, in the current season", async () => {
    expect((await create(current, playoffs)).status).toBe(401);
    expect((await create(current, playoffs, player())).status).toBe(403);
    expect((await create(previous, playoffs, admin())).status).toBe(409);
  });
  it("refuses an unknown sport, a bad slot and a nameless tournament", async () => {
    expect((await create(current, { ...playoffs, sportId: "99" }, admin())).status).toBe(400);
    expect((await create(current, { ...playoffs, slots: [{ ...slots()[0], slot: 17 }] }, admin())).status).toBe(400);
    expect((await create(current, { kind: "tournament", name: "!!!", sportId: "11", slots: slots(true) }, admin())).status).toBe(400);
    expect((await create(current, { kind: "tournament", sportId: "11", slots: slots(true) }, admin())).status).toBe(400);
  });
  it("creates a sport's playoffs: games for every slot but the byes, a bye's college in its quarterfinal", async () => {
    const r = await create(current, playoffs, admin());
    expect(r).toMatchObject({ status: 201, body: { id: "volleyball-playoffs" } });
    const detail = await api("GET", `/api/seasons/${current}/brackets/volleyball-playoffs`);
    expect(detail.body).toMatchObject({ kind: "playoffs", name: "Volleyball Playoffs", sportId: "11", placementPoints: null });
    expect(detail.body.matches).toHaveLength(13);
    const quarterfinal = detail.body.matches.find((m: { bracketSlot: number }) => m.bracketSlot === 5);
    expect(quarterfinal).toMatchObject({ awayCollegeId: COLLEGES[0].id, homeCollegeId: null, round: "Quarterfinal" });
    expect((await create(current, playoffs, admin())).status).toBe(409);
  });
  it("creates a tournament with the default placement points", async () => {
    const r = await create(current, { kind: "tournament", name: "Winter Volleyball Cup", sportId: "11", slots: slots(true) }, admin());
    expect(r).toMatchObject({ status: 201, body: { id: "winter-volleyball-cup" } });
    const detail = await api("GET", `/api/seasons/${current}/brackets/winter-volleyball-cup`);
    expect(detail.body).toMatchObject({ thirdPlaceSlot: 16, placementPoints: { first: 20, second: 15, third: 10 }, placements: { first: null } });
  });
  it("deletes: 409 with the scored games, then with force, taking the points back", async () => {
    const path = `/api/seasons/${current}/brackets/volleyball-playoffs`;
    const game = (await api("GET", path)).body.matches.find((m: { bracketSlot: number }) => m.bracketSlot === 2);
    const points = async () => (await db.doc(`seasons/${current}/colleges/${game.homeCollegeId}`).get()).data()!.points;
    const before = await points();
    expect((await api("PUT", `/api/seasons/${current}/matches/${game.id}/result`, { homeScore: 2, awayScore: 0, homeForfeit: false, awayForfeit: false }, { session: admin() })).status).toBe(204);
    expect(await points()).toBe(before + game.pointsForWin);

    expect((await api("DELETE", path, undefined, { session: player() })).status).toBe(403);
    expect(await api("DELETE", path, undefined, { session: admin() })).toMatchObject({ status: 409, body: { error: { code: "conflict", details: { scoredMatchIds: [game.id] } } } });
    expect((await api("DELETE", `${path}?force=true`, undefined, { session: admin() })).status).toBe(204);
    expect(await points()).toBe(before);
    expect((await db.doc(`seasons/${current}/matches/${game.id}`).get()).exists).toBe(false);
    expect((await api("DELETE", path, undefined, { session: admin() })).status).toBe(404);
    expect((await api("DELETE", `/api/seasons/${current}/brackets/winter-volleyball-cup`, undefined, { session: admin() })).status).toBe(204);
  });
});
