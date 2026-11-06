// Result corrections must not rewrite a scored winner/loser destination.
// Exercise the real API and verify that refused changes leave every affected
// game, standing, team record, placement and audit entry unchanged.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { BracketDetail, BracketSlotInput } from "@/lib/api/brackets";
import { COLLEGES } from "@/lib/colleges";
import type { MatchDoc } from "@/types/firestore";
import { api, db, people, seasons, sessionFor } from "./helpers";

let current: string;
const created: string[] = [];
const admin = () => ({ session: sessionFor(people.admin) });

beforeAll(async () => {
  ({ current } = await seasons());
});

afterEach(async () => {
  for (const id of created.splice(0)) {
    expect((await api("DELETE", `/api/seasons/${current}/brackets/${id}?force=true`, undefined, admin())).status).toBe(204);
  }
});

interface Fixture {
  id: string;
  matchIds: Map<number, string>;
}

async function createFixture(kind: "playoffs" | "tournament" = "playoffs"): Promise<Fixture> {
  const firstRound: Record<number, [string, string | null]> = {
    1: ["BF", null], 2: ["BK", "BR"], 3: ["DC", "ES"], 4: ["GH", "JE"],
    7: ["MC", null], 8: ["MY", "PC"], 9: ["SY", "SM"], 10: ["TD", "TC"],
  };
  const seeds = new Map(COLLEGES.map((c, i) => [c.id as string, i + 1]));
  const startsAt = new Date(Date.now() + 30 * 86400_000).toISOString();
  const slots: BracketSlotInput[] = Array.from({ length: kind === "tournament" ? 16 : 15 }, (_, i) => {
    const slot = i + 1;
    const [home, away] = firstRound[slot] ?? [null, null];
    return {
      slot, homeCollegeId: home, awayCollegeId: away,
      homeSeed: home ? seeds.get(home)! : null, awaySeed: away ? seeds.get(away)! : null,
      division: kind === "tournament" ? null : slot === 15 ? "final" : slot <= 6 || slot === 13 ? "blue" : "green",
      startsAt, venue: "Correction test court", venueDetail: null,
    };
  });
  const body = kind === "tournament"
    ? { kind, name: "Result Correction Cup", sportId: "11", slots }
    : { kind, sportId: "11", slots };
  const response = await api("POST", `/api/seasons/${current}/brackets`, body, admin());
  expect(response.status).toBe(201);
  const id = response.body.id as string;
  created.push(id);
  const detail = (await api("GET", `/api/seasons/${current}/brackets/${id}`)).body as BracketDetail;
  return { id, matchIds: new Map(detail.matches.map((m) => [m.bracketSlot!, m.id])) };
}

const matchPath = (f: Fixture, slot: number) => `seasons/${current}/matches/${f.matchIds.get(slot)!}`;
const resultPath = (f: Fixture, slot: number) => `/api/${matchPath(f, slot)}/result`;
const score = (f: Fixture, slot: number, homeScore = 2, awayScore = 0) =>
  api("PUT", resultPath(f, slot), { homeScore, awayScore, homeForfeit: false, awayForfeit: false }, admin());
const undo = (f: Fixture, slot: number) => api("DELETE", resultPath(f, slot), undefined, admin());
const game = async (f: Fixture, slot: number) => (await db.doc(matchPath(f, slot)).get()).data() as MatchDoc;

/** Snapshot every document the operation could change, including the number of audit entries. */
async function snapshot(f: Fixture) {
  const refs = [
    db.doc(`seasons/${current}/brackets/${f.id}`),
    ...[...f.matchIds.keys()].map((slot) => db.doc(matchPath(f, slot))),
    ...COLLEGES.flatMap((c) => [
      db.doc(`seasons/${current}/colleges/${c.id}`),
      db.doc(`seasons/${current}/colleges/${c.id}/teams/11`),
    ]),
  ];
  const [docs, logCount] = await Promise.all([
    db.getAll(...refs),
    db.collection(`seasons/${current}/auditLog`).count().get(),
  ]);
  return { docs: docs.map((d) => ({ path: d.ref.path, data: d.data() })), logCount: logCount.data().count };
}

async function totals() {
  const colleges = await db.collection(`seasons/${current}/colleges`).get();
  return Object.fromEntries(colleges.docs.map((d) => {
    const { points, games, wins, losses, ties, forfeits } = d.data();
    return [d.id, { points, games, wins, losses, ties, forfeits }];
  }));
}

function expectBlocked(response: Awaited<ReturnType<typeof api>>, matchIds: string[]) {
  expect(response).toMatchObject({
    status: 409,
    body: { error: { code: "conflict", details: { scoredMatchIds: matchIds } } },
  });
}

describe("bracket result corrections", () => {
  it("refuses to undo a feeder of a scored game without changing any data", async () => {
    const f = await createFixture();
    expect((await score(f, 2)).status).toBe(204);
    expect((await score(f, 5)).status).toBe(204);
    const before = await snapshot(f);

    expectBlocked(await undo(f, 2), [f.matchIds.get(5)!]);
    expect(await snapshot(f)).toEqual(before);
  });

  it("refuses to rescore a previously undone feeder when its next game has since been scored", async () => {
    const f = await createFixture();
    expect((await score(f, 2)).status).toBe(204);
    expect((await undo(f, 2)).status).toBe(204);
    // Existing behavior retains the advanced team after undo, so this state
    // can also be left by an earlier version of the app.
    expect((await score(f, 5)).status).toBe(204);
    const before = await snapshot(f);

    expectBlocked(await score(f, 2, 0, 2), [f.matchIds.get(5)!]);
    expect(await snapshot(f)).toEqual(before);
  });

  it("allows a correction after the later score is undone, moving the new winner and seed", async () => {
    const f = await createFixture();
    const before = await totals();
    expect((await score(f, 2)).status).toBe(204);
    expect((await score(f, 5)).status).toBe(204);
    expect((await undo(f, 5)).status).toBe(204);
    expect((await undo(f, 2)).status).toBe(204);
    expect((await score(f, 2, 0, 2)).status).toBe(204);
    expect(await game(f, 5)).toMatchObject({ status: "scheduled", homeCollegeId: "BR", homeSeed: 3, awayCollegeId: "BF", result: null });

    expect((await score(f, 5)).status).toBe(204);
    const points = (await game(f, 2)).pointsForWin;
    expect((await totals()).BR.points).toBe(before.BR.points + 2 * points);
    expect((await totals()).BK.points).toBe(before.BK.points);
    expect((await undo(f, 5)).status).toBe(204);
    expect((await undo(f, 2)).status).toBe(204);
    expect(await totals()).toEqual(before);
  });

  it.each([15, 16])("protects a semifinal when destination slot %s is scored, then recomputes and reverses bonuses correctly", async (destination) => {
    const f = await createFixture("tournament");
    for (const slot of [2, 3, 4, 8, 9, 10, 5, 6, 11, 12, 13, 14, destination]) {
      expect((await score(f, slot)).status).toBe(204);
    }
    const before = await snapshot(f);
    expectBlocked(await undo(f, 13), [f.matchIds.get(destination)!]);
    expect(await snapshot(f)).toEqual(before);

    expect((await undo(f, destination)).status).toBe(204);
    expect((await undo(f, 13)).status).toBe(204);
    expect((await score(f, 13, 0, 2)).status).toBe(204);
    expect(await game(f, 15)).toMatchObject({ awayCollegeId: "BK", awaySeed: 2 });
    expect(await game(f, 16)).toMatchObject({ awayCollegeId: "GH", awaySeed: 6 });

    const beforeFinals = await totals();
    expect((await score(f, 15)).status).toBe(204);
    expect((await score(f, 16)).status).toBe(204);
    const bracket = (await db.doc(`seasons/${current}/brackets/${f.id}`).get()).data()!;
    expect(bracket.placements).toEqual({ first: "TD", second: "BK", third: "MY" });
    const afterFinals = await totals();
    const points = (await game(f, 15)).pointsForWin;
    expect(afterFinals.TD.points).toBe(beforeFinals.TD.points + points + 20);
    expect(afterFinals.BK.points).toBe(beforeFinals.BK.points + 15);
    expect(afterFinals.MY.points).toBe(beforeFinals.MY.points + points + 10);
    expect(afterFinals.GH.points).toBe(beforeFinals.GH.points);

    expect((await undo(f, 15)).status).toBe(204);
    expect((await undo(f, 16)).status).toBe(204);
    expect(await totals()).toEqual(beforeFinals);
    expect((await db.doc(`seasons/${current}/brackets/${f.id}`).get()).data()!.placements).toEqual({ first: null, second: null, third: null });
  });

  it.each(["feeder first", "next game first"])("serializes concurrent scoring (%s)", async (order) => {
    const f = await createFixture();
    expect((await score(f, 2)).status).toBe(204);
    expect((await undo(f, 2)).status).toBe(204);
    const before = await totals();
    const responses = await Promise.all(order === "feeder first"
      ? [score(f, 2, 0, 2), score(f, 5)]
      : [score(f, 5), score(f, 2, 0, 2)]);
    const [feeder, next] = order === "feeder first" ? responses : [responses[1], responses[0]];
    expect(next.status).toBe(204);
    expect([204, 409]).toContain(feeder.status);

    const nextGame = await game(f, 5);
    const after = await totals();
    const points = nextGame.pointsForWin;
    if (feeder.status === 204) {
      expect(nextGame).toMatchObject({ status: "final", homeCollegeId: "BR" });
      expect(after.BR.points).toBe(before.BR.points + 2 * points);
      expect(after.BK.points).toBe(before.BK.points);
    } else {
      expectBlocked(feeder, [f.matchIds.get(5)!]);
      expect(nextGame).toMatchObject({ status: "final", homeCollegeId: "BK" });
      expect(after.BK.points).toBe(before.BK.points + points);
      expect(after.BR.points).toBe(before.BR.points);
      expect(await game(f, 2)).toMatchObject({ status: "scheduled", result: null });
    }
  });
});
