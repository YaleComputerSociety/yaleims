// Audit entries stay small however large the action, so logging never makes
// an action fail; an action beyond the child-record cap is refused whole.
// Fixtures live only in the integration runner's disposable emulator.
import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { COLLEGES } from "@/lib/colleges";
import { paths } from "@/lib/paths";
import type { BracketDetail } from "@/lib/api/brackets";
import type { AuditLogDoc } from "@/types/firestore";
import { api, db, people, seasons, sessionFor } from "./helpers";

const { logAction } = await import("@/server/data/auditLog");
const { addScoreReport } = await import("@/server/data/scoreReports");

/** Well above the 256 KiB entry budget's estimate, and far below Firestore's 1 MiB. */
const ENTRY_CEILING = 300 * 1024;

let current: string;
const matchIds: string[] = [];
const bracketIds: string[] = [];
const admin = () => ({ session: sessionFor(people.admin) });

beforeAll(async () => {
  ({ current } = await seasons());
});

afterEach(async () => {
  // Clear oversized test fixtures before using the production deletion path
  // to reverse any scored bracket games and their standings.
  for (const id of bracketIds.splice(0)) {
    const bracket = (await db.doc(`seasons/${current}/brackets/${id}`).get()).data();
    if (!bracket) continue;
    for (const slot of bracket.slots as { matchId: string | null }[]) {
      if (slot.matchId) {
        await db.recursiveDelete(db.collection(paths.scoreReports(current, slot.matchId)));
        await db.recursiveDelete(db.collection(paths.roster(current, slot.matchId)));
      }
    }
    expect((await api("DELETE", `/api/seasons/${current}/brackets/${id}?force=true`, undefined, admin())).status).toBe(204);
  }
  for (const id of matchIds.splice(0)) {
    await db.recursiveDelete(db.doc(`seasons/${current}/matches/${id}`));
  }
});

async function createGame(): Promise<string> {
  const response = await api("POST", `/api/seasons/${current}/matches`, {
    sportId: "1",
    matches: [{
      startsAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
      homeCollegeId: "BF", awayCollegeId: "BK", venue: "Audit test court", venueDetail: null,
    }],
  }, admin());
  expect(response.status).toBe(201);
  const id = response.body.matchIds[0] as string;
  matchIds.push(id);
  return id;
}

async function addReports(matchId: string, count: number, reason = "漢".repeat(1000)) {
  const at = new Timestamp(1_800_000_000, 123_456_789);
  for (let start = 0; start < count; start += 200) {
    const batch = db.batch();
    for (let i = start; i < Math.min(count, start + 200); i++) {
      batch.create(db.doc(`seasons/${current}/matches/${matchId}/scoreReports/report-${i}`), {
        seasonId: current, matchId, reason,
        reportedBy: people.student(0, 7), reporterName: "Audit Test Reporter",
        reportedAt: at, scoreAtReport: { home: null, away: null },
        status: "open", resolvedBy: null, resolvedAt: null,
      });
    }
    await batch.commit();
  }
  // Compare audits with what Firestore persisted, including its timestamp precision.
  return (await db.doc(paths.scoreReport(current, matchId, "report-0")).get()).data()!.reportedAt as Timestamp;
}

async function findLog(action: string, key: string, id: string) {
  const logs = await db.collection(paths.auditLog(current)).where("action", "==", action).get();
  const snap = logs.docs.find((d) => d.data().params[key] === id);
  expect(snap).toBeDefined();
  // The stored size, as Firestore's own JSON encoding of the values bounds it.
  expect(Buffer.byteLength(JSON.stringify(snap!.data()))).toBeLessThan(ENTRY_CEILING);
  return snap!.data() as AuditLogDoc;
}

async function expectUntouched(id: string, count: number) {
  expect((await db.doc(paths.match(current, id)).get()).exists).toBe(true);
  expect((await db.collection(paths.scoreReports(current, id)).count().get()).data().count).toBe(count);
  const logs = await db.collection(paths.auditLog(current)).where("action", "==", "deleteMatch").get();
  expect(logs.docs.some((d) => d.data().params.matchId === id)).toBe(false);
}

async function standings() {
  const colleges = await db.collection(paths.colleges(current)).get();
  return colleges.docs.map((d) => {
    const { points, games, wins, losses, ties, forfeits } = d.data();
    return { id: d.id, points, games, wins, losses, ties, forfeits };
  });
}

async function createTournament(): Promise<BracketDetail> {
  const firstRound: Record<number, [string, string | null]> = {
    1: ["BF", null], 2: ["BK", "BR"], 3: ["DC", "ES"], 4: ["GH", "JE"],
    7: ["MC", null], 8: ["MY", "PC"], 9: ["SY", "SM"], 10: ["TD", "TC"],
  };
  const startsAt = new Date(Date.now() + 30 * 86400_000).toISOString();
  const slots = Array.from({ length: 16 }, (_, i) => {
    const slot = i + 1;
    const [home, away] = firstRound[slot] ?? [null, null];
    return { slot, homeCollegeId: home, awayCollegeId: away, homeSeed: null, awaySeed: null, division: null, startsAt, venue: "Audit test court", venueDetail: null };
  });
  const response = await api("POST", `/api/seasons/${current}/brackets`, { kind: "tournament", name: "Audit Storage Cup", sportId: "1", slots }, admin());
  expect(response.status).toBe(201);
  const id = response.body.id as string;
  bracketIds.push(id);
  return (await api("GET", `/api/seasons/${current}/brackets/${id}`)).body as BracketDetail;
}

describe("bounded audit storage", () => {
  it("deletes a game with 360 maximum-length Unicode reports, keeping the game's copy and counting the rest", async () => {
    const id = await createGame();
    const at = await addReports(id, 360);
    const before = (await db.doc(paths.match(current, id)).get()).data();
    expect((await api("DELETE", `/api/seasons/${current}/matches/${id}`, undefined, admin())).status).toBe(204);
    expect((await db.doc(paths.match(current, id)).get()).exists).toBe(false);
    expect((await db.collection(paths.scoreReports(current, id)).get()).empty).toBe(true);
    const log = await findLog("deleteMatch", "matchId", id);
    expect(log.before[paths.match(current, id)]).toStrictEqual(before);
    expect(log.targets).toHaveLength(361);
    const copied = Object.keys(log.before).filter((p) => p.includes("/scoreReports/"));
    expect(copied.length).toBeGreaterThan(0);
    expect(log.before[copied[0]]!.reportedAt).toStrictEqual(at);
    expect(log.truncated).toEqual({ copies: 360 - copied.length, paths: 0 });
  });

  it("deletes a game whose document is near Firestore's size limit, listing it without a copy", async () => {
    const id = await createGame();
    await db.doc(paths.match(current, id)).update({ legacyNote: "é".repeat(500_000) });
    expect((await api("DELETE", `/api/seasons/${current}/matches/${id}`, undefined, admin())).status).toBe(204);
    const log = await findLog("deleteMatch", "matchId", id);
    expect(log.targets).toEqual([paths.match(current, id)]);
    expect(log.before).toEqual({});
    expect(log.truncated).toEqual({ copies: 1, paths: 0 });
  });

  it("writes a small entry with nothing truncated for an ordinary delete", async () => {
    const id = await createGame();
    await addReports(id, 3, "A short reason");
    expect((await api("DELETE", `/api/seasons/${current}/matches/${id}`, undefined, admin())).status).toBe(204);
    const log = await findLog("deleteMatch", "matchId", id);
    expect(Object.keys(log.before)).toHaveLength(4);
    expect(log.truncated).toBeNull();
  });

  it("refuses an action beyond the child-record cap without any change or audit", async () => {
    const id = await createGame();
    await addReports(id, 2001, "A short reason");
    const response = await api("DELETE", `/api/seasons/${current}/matches/${id}`, undefined, admin());
    expect(response).toMatchObject({ status: 409, body: { error: { code: "conflict", details: { maxChildren: 2000 } } } });
    await expectUntouched(id, 2001);
  });

  it("deletes a large scored tournament atomically and reverses its points", async () => {
    const bracket = await createTournament();
    const match = bracket.matches.find((m) => m.bracketSlot === 2)!;
    const before = await standings();
    expect((await api("PUT", `/api/seasons/${current}/matches/${match.id}/result`, { homeScore: 2, awayScore: 0, homeForfeit: false, awayForfeit: false }, admin())).status).toBe(204);
    await addReports(match.id, 360);
    const sources = await db.getAll(
      db.doc(paths.bracket(current, bracket.id)),
      ...bracket.matches.map((m) => db.doc(paths.match(current, m.id))),
      ...COLLEGES.filter((c) => match.collegeIds.includes(c.id)).flatMap((c) => [
        db.doc(paths.college(current, c.id)), db.doc(paths.team(current, c.id, match.sportId)),
      ]),
    );
    expect((await api("DELETE", `/api/seasons/${current}/brackets/${bracket.id}?force=true`, undefined, admin())).status).toBe(204);
    expect(await standings()).toEqual(before);
    expect((await db.doc(paths.bracket(current, bracket.id)).get()).exists).toBe(false);
    expect((await db.getAll(...bracket.matches.map((m) => db.doc(paths.match(current, m.id))))).every((s) => !s.exists)).toBe(true);
    expect((await db.collection(paths.scoreReports(current, match.id)).get()).empty).toBe(true);
    // The bracket, its games and the standings come first, so they are all copied.
    const log = await findLog("deleteTournament", "bracketId", bracket.id);
    for (const source of sources) expect(log.before[source.ref.path]).toStrictEqual(source.data());
    expect(log.truncated!.copies).toBeGreaterThan(0);
  });

  it("writes no audit entry when the action's transaction aborts", async () => {
    const id = await createGame();
    await addReports(id, 80);
    const count = () => db.collection(paths.auditLog(current)).count().get().then((s) => s.data().count);
    const before = await count();
    await expect(db.runTransaction(async (tx) => {
      const parent = await tx.get(db.doc(paths.match(current, id)));
      const reports = await tx.get(db.collection(paths.scoreReports(current, id)));
      tx.delete(parent.ref);
      logAction(tx, current, {
        actor: { userId: people.admin, roles: ["admin"] }, action: "testAbort", params: { matchId: id },
        changed: [parent, ...reports.docs],
      });
      throw new Error("Abort the whole operation");
    })).rejects.toThrow("Abort the whole operation");
    expect(await count()).toBe(before);
    await expectUntouched(id, 80);
  });

  it("refuses a late report writer whose game has already been deleted", async () => {
    const id = await createGame();
    expect((await api("DELETE", `/api/seasons/${current}/matches/${id}`, undefined, admin())).status).toBe(204);
    await expect(addScoreReport(current, id, {
      reason: "A report started before deletion", reportedBy: people.student(0, 7), reporterName: "Late reporter",
    })).rejects.toMatchObject({ code: "not-found", status: 404 });
    expect((await db.collection(paths.scoreReports(current, id)).get()).empty).toBe(true);
  });

  it("leaves no orphan reports when reporting and deletion run concurrently", async () => {
    const id = await createGame();
    await addReports(id, 80);
    const reports = Array.from({ length: 3 }, (_, i) => api("POST", `/api/seasons/${current}/matches/${id}/reports`,
      { reason: `Concurrent report ${i}` }, { session: sessionFor(people.student(0, 7)) }));
    const [removed, ...results] = await Promise.all([
      api("DELETE", `/api/seasons/${current}/matches/${id}`, undefined, admin()), ...reports,
    ]);
    expect(removed.status).toBe(204);
    for (const result of results) expect([201, 404]).toContain(result.status);
    expect((await db.doc(paths.match(current, id)).get()).exists).toBe(false);
    expect((await db.collection(paths.scoreReports(current, id)).get()).empty).toBe(true);
  });
});
