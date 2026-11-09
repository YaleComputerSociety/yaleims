// A game's roster and the caller's sign-up (D34), and score reports.
import { beforeAll, describe, expect, it } from "vitest";
import { COLLEGES } from "@/lib/colleges";
import { api, db, people, seasons, sessionFor } from "./helpers";

let current: string;
beforeAll(async () => {
  ({ current } = await seasons());
});
const admin = () => sessionFor(people.admin);

/** An upcoming regular game of the current season with `collegeId` on one side. */
async function upcomingGameOf(collegeId: string) {
  const games = await db.collection(`seasons/${current}/matches`).where("collegeIds", "array-contains", collegeId).where("startsAt", ">", new Date()).orderBy("startsAt").get();
  return games.docs.find((g) => g.data().stage === "regular")!;
}

describe("GET …/matches/{m}/roster (who sees the participants, lib/participants.ts)", () => {
  const collegeIndex = (id: string) => COLLEGES.findIndex((c) => c.id === id);
  /** Puts the test's entries on `game` (by player: side, captain's call, presence) instead of its own; restored after. */
  async function withEntries(game: FirebaseFirestore.QueryDocumentSnapshot, entries: Record<string, { side: string; call?: "confirmed" | "removed"; present?: boolean }>, run: () => Promise<void>) {
    const roster = db.collection(`seasons/${current}/matches/${game.id}/roster`);
    const before = (await roster.get()).docs.map((d) => [d.id, d.data()] as const);
    for (const [id] of before) await roster.doc(id).delete();
    const match = game.data();
    for (const [playerId, e] of Object.entries(entries)) {
      await roster.doc(playerId).set({
        seasonId: current, matchId: game.id, sportId: match.sportId, collegeId: e.side, playerId, name: "Copy", startsAt: match.startsAt,
        addedBy: "self", addedByUser: playerId, signedUpAt: match.startsAt, captainStatus: e.call ?? null, captainBy: null, captainAt: null,
        present: e.present ?? false, presentBy: null, presentAt: null,
      });
    }
    try {
      await run();
    } finally {
      for (const d of (await roster.get()).docs) await d.ref.delete();
      for (const [id, data] of before) await roster.doc(id).set(data);
    }
  }
  const get = (game: { id: string }, who?: string) => api("GET", `/api/seasons/${current}/matches/${game.id}/roster`, undefined, who ? { session: sessionFor(who) } : {});
  const names = (r: { body: { items: { name: string }[] } }) => r.body.items.map((e) => e.name).sort();

  it("before the start: both sides, with status, for the colleges' players, anyone on the game and supervisors; no one else", async () => {
    const game = await upcomingGameOf("BF");
    const [a, b] = game.data().collegeIds as string[];
    const [ai, bi] = [collegeIndex(a), collegeIndex(b)];
    const outsider = people.student([0, 1, 2, 3].find((i) => ![ai, bi].includes(i))!, 7);
    const visitor = people.student([4, 5, 6, 7].find((i) => ![ai, bi].includes(i))!, 7); // another college's player, on the game
    await withEntries(game, {
      [people.student(ai, 2)]: { side: a },
      [people.student(bi, 2)]: { side: b, call: "confirmed" },
      [people.student(bi, 3)]: { side: b, call: "removed" },
      [visitor]: { side: a },
    }, async () => {
      expect((await get(game)).status).toBe(401);
      const mine = await get(game, people.student(ai, 6));
      expect(mine.body).toMatchObject({ visible: true, started: false, total: 3 });
      expect(mine.body.items.map((e: { collegeId: string }) => e.collegeId).sort()).toEqual([a, a, b].sort());
      for (const e of mine.body.items) {
        expect(e).toMatchObject({ name: expect.any(String), netid: expect.any(String) });
        expect(e).not.toHaveProperty("playerId");
        expect(e).not.toHaveProperty("email");
      }
      // The name is the account's, not the entry's copy.
      expect(names(mine)).not.toContain("Copy");
      const other = await get(game, people.student(bi, 6));
      expect(names(other)).toEqual(names(mine));

      expect((await get(game, outsider)).body).toMatchObject({ visible: false, items: [], total: 0 });
      expect((await get(game, visitor)).body).toMatchObject({ visible: true, total: 3 });
      expect((await get(game, people.supervisor)).body).toMatchObject({ visible: true, total: 3 });
      const asAdmin = await get(game, people.admin);
      expect(asAdmin.body.items[0]).toHaveProperty("email");
      // The taken-off player sees their own entry, and the game as one of its colleges' players.
      expect((await get(game, people.student(bi, 3))).body.mine).toMatchObject({ captainStatus: "removed" });
    });
  });

  it("from the start: only those a supervisor recorded present", async () => {
    const game = (await db.collection(`seasons/${current}/matches`).where("status", "==", "final").orderBy("startsAt", "desc").limit(1).get()).docs[0];
    const [a, b] = game.data().collegeIds as string[];
    const [ai, bi] = [collegeIndex(a), collegeIndex(b)];
    await withEntries(game, {
      [people.student(ai, 2)]: { side: a, present: true },
      [people.student(ai, 3)]: { side: a, call: "confirmed" },
      [people.student(bi, 2)]: { side: b, present: true },
    }, async () => {
      const r = await get(game, people.student(bi, 6));
      expect(r.body).toMatchObject({ visible: true, started: true, total: 2 });
      expect(r.body.items.every((e: { present: boolean }) => e.present)).toBe(true);
    });
  });
});

describe("PUT and DELETE …/matches/{m}/roster/me", () => {
  it("signs up for one's own college's game, idempotently, and withdraws", async () => {
    const game = await upcomingGameOf("GH");
    const me = people.student(5, 7); // Grace Hopper (index 5), not signed up anywhere
    const path = `/api/seasons/${current}/matches/${game.id}/roster/me`;
    expect((await api("PUT", path)).status).toBe(401);
    expect((await api("PUT", path, undefined, { session: sessionFor(me) })).status).toBe(204);
    expect((await api("PUT", path, undefined, { session: sessionFor(me) })).status).toBe(204);
    const entry = (await db.doc(`seasons/${current}/matches/${game.id}/roster/${me}`).get()).data()!;
    expect(entry).toMatchObject({ collegeId: "GH", addedBy: "self", addedByUser: me, captainStatus: null });
    expect((await api("DELETE", path, undefined, { session: sessionFor(me) })).status).toBe(204);
    expect((await db.doc(`seasons/${current}/matches/${game.id}/roster/${me}`).get()).exists).toBe(false);
    expect((await api("DELETE", path, undefined, { session: sessionFor(me) })).status).toBe(204);
  });
  it("refuses another college's game, a started game and an unknown one", async () => {
    const game = await upcomingGameOf("GH");
    const outsider = game.data().collegeIds.includes("JE") ? people.student(7, 7) : people.student(6, 7);
    const started = (await db.collection(`seasons/${current}/matches`).where("collegeIds", "array-contains", "GH").where("startsAt", "<", new Date()).limit(1).get()).docs[0];
    expect(await api("PUT", `/api/seasons/${current}/matches/${game.id}/roster/me`, undefined, { session: sessionFor(outsider) })).toMatchObject({ status: 403, body: { error: { code: "forbidden" } } });
    expect((await api("PUT", `/api/seasons/${current}/matches/${started.id}/roster/me`, undefined, { session: sessionFor(people.student(5, 7)) })).status).toBe(409);
    expect((await api("PUT", `/api/seasons/${current}/matches/nope/roster/me`, undefined, { session: sessionFor(people.student(5, 7)) })).status).toBe(404);
  });
  it("keeps a player their captain removed off the game", async () => {
    const removed = (await db.collectionGroup("roster").where("captainStatus", "==", "removed").get()).docs[0].data();
    const path = `/api/seasons/${current}/matches/${removed.matchId}/roster/me`;
    expect((await api("PUT", path, undefined, { session: sessionFor(removed.playerId) })).status).toBe(403);
    expect((await api("DELETE", path, undefined, { session: sessionFor(removed.playerId) })).status).toBe(409);
  });
  it("lets a returning student join the season with the college Yalies gives, then signs them up", async () => {
    // Benjamin Franklin's alum (played last season only) and an upcoming BF game; the fake
    // directory places zz903 in BF. The cookie's college is ignored (decision 5).
    const game = (await db.collection(`seasons/${current}/matches`).where("stage", "==", "regular").where("startsAt", ">", new Date()).get())
      .docs.find((d) => d.data().collegeIds.includes("BF"))!;
    const alum = "alum01@example.edu";
    expect((await db.doc(`seasons/${current}/players/${alum}`).get()).exists).toBe(false);
    const login = { netid: "zz903", college: "Morse" };
    const r = await api("PUT", `/api/seasons/${current}/matches/${game.id}/roster/me`, undefined, { session: sessionFor(alum, [], login) });
    expect(r.status).toBe(204);
    const { name } = (await db.doc(`users/${alum}`).get()).data()!;
    expect((await db.doc(`seasons/${current}/players/${alum}`).get()).data()).toMatchObject({ collegeId: "BF", name, joinedVia: "login" });
  });
});

describe("score reports", () => {
  const played = async () => (await db.collection(`seasons/${current}/matches`).where("status", "==", "final").orderBy("startsAt", "desc").limit(1).get()).docs[0];

  it("are filed by anyone signed in, with the game's score; refused for an unknown game or no reason", async () => {
    const game = await played();
    const path = `/api/seasons/${current}/matches/${game.id}/reports`;
    expect((await api("POST", path, { reason: "Wrong" })).status).toBe(401);
    expect((await api("POST", path, { reason: "  " }, { session: sessionFor(people.student(4, 6)) })).status).toBe(400);
    expect((await api("POST", `/api/seasons/${current}/matches/nope/reports`, { reason: "Wrong" }, { session: sessionFor(people.student(4, 6)) })).status).toBe(404);
    const r = await api("POST", path, { reason: " Flipped " }, { session: sessionFor(people.student(4, 6)) });
    expect(r.status).toBe(201);
    const doc = (await db.doc(`seasons/${current}/matches/${game.id}/scoreReports/${r.body.id}`).get()).data()!;
    const { name } = (await db.doc(`users/${people.student(4, 6)}`).get()).data()!;
    expect(doc).toMatchObject({
      reason: "Flipped", reportedBy: people.student(4, 6), reporterName: name, status: "open",
      scoreAtReport: { home: game.data().result.homeScore, away: game.data().result.awayScore },
    });
  });
  it("show reporters' ids to supervisors and admins only", async () => {
    const game = await played();
    const path = `/api/seasons/${current}/matches/${game.id}/reports`;
    const asPlayer = await api("GET", path, undefined, { session: sessionFor(people.student(4, 6)) });
    expect(asPlayer.body.total).toBeGreaterThan(0);
    expect(asPlayer.body.items[0]).not.toHaveProperty("reportedBy");
    expect(asPlayer.body.items[0].reporterName).toBe((await db.doc(`users/${people.student(4, 6)}`).get()).data()!.name);
    expect(asPlayer.body.items[0]).not.toHaveProperty("reporter");
    const asSupervisor = await api("GET", path, undefined, { session: sessionFor(people.supervisor) });
    expect(asSupervisor.body.items[0].reporter).toEqual({ name: asPlayer.body.items[0].reporterName, netid: expect.any(String) });
    const asAdmin = await api("GET", path, undefined, { session: admin() });
    expect(asAdmin.body.items[0].reportedBy).toBe(people.student(4, 6));
    expect(asAdmin.body.items[0].reporter).toMatchObject({ email: people.student(4, 6) });
  });
  it("are resolved by admins, and listed for the season with their game", async () => {
    const game = await played();
    const report = (await db.collection(`seasons/${current}/matches/${game.id}/scoreReports`).where("status", "==", "open").limit(1).get()).docs[0];
    const path = `/api/seasons/${current}/matches/${game.id}/reports/${report.id}`;
    expect((await api("PATCH", path, { status: "resolved" }, { session: sessionFor(people.student(4, 6)) })).status).toBe(403);
    expect((await api("PATCH", path, { status: "open" }, { session: admin() })).status).toBe(400);
    expect((await api("PATCH", `${path}x`, { status: "resolved" }, { session: admin() })).status).toBe(404);
    expect((await api("PATCH", path, { status: "resolved" }, { session: admin() })).status).toBe(204);
    expect((await report.ref.get()).data()).toMatchObject({ status: "resolved", resolvedBy: people.admin });
    const forPlayers = await api("GET", `/api/seasons/${current}/matches/${game.id}/reports`, undefined, { session: sessionFor(people.student(4, 6)) });
    expect(forPlayers.body.items.find((r: { id: string }) => r.id === report.id)).toMatchObject({ resolverName: "Devon Admin" });

    expect((await api("GET", `/api/seasons/${current}/reports`, undefined, { session: sessionFor(people.student(4, 6)) })).status).toBe(403);
    const all = await api("GET", `/api/seasons/${current}/reports`, undefined, { session: admin() });
    const listed = all.body.items.find((r: { id: string }) => r.id === report.id);
    expect(listed).toMatchObject({ status: "resolved", resolverName: "Devon Admin", match: { id: game.id, homeCollegeId: game.data().homeCollegeId } });
    expect(listed.match).not.toHaveProperty("scoredBy");
    const open = await api("GET", `/api/seasons/${current}/reports?status=open`, undefined, { session: admin() });
    expect(open.body.items.every((r: { status: string }) => r.status === "open")).toBe(true);
    expect(open.body.total).toBeLessThan(all.body.total);
  });
});
