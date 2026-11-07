// Participant changes erase the departing college's entire active roster;
// an incoming college starts blank. Every change and its audit are atomic.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import type { BracketDetail } from "@/lib/api/brackets";
import { COLLEGES } from "@/lib/colleges";
import { paths } from "@/lib/paths";
import type { AuditLogDoc, MatchDoc, RosterEntryDoc } from "@/types/firestore";
import { api, db, people, seasons, sessionFor } from "./helpers";

const { editMatch: editMatchService } = await import("@/server/services/schedule");

let current: string;
const games: string[] = [];
const brackets: string[] = [];
const admin = () => ({ session: sessionFor(people.admin) });
const actor = { userId: people.admin, roles: ["admin"] };
const at = () => new Date(Date.now() + 35 * 86400_000).toISOString();
const result = { homeScore: 2, awayScore: 0, homeForfeit: false, awayForfeit: false };
const gameUrl = (id: string) => `/api/seasons/${current}/matches/${id}`;
const gameRef = (id: string) => db.doc(paths.match(current, id));
const rosterRef = (id: string) => db.collection(paths.roster(current, id));
const edit = (id: string, body: object, email = people.admin) => api("PATCH", gameUrl(id), body, { session: sessionFor(email) });
const score = (id: string, body: object = result) => api("PUT", `${gameUrl(id)}/result`, body, admin());
const undo = (id: string) => api("DELETE", `${gameUrl(id)}/result`, undefined, admin());
const game = async (id: string) => (await gameRef(id).get()).data() as MatchDoc;

beforeAll(async () => { ({ current } = await seasons()); });

afterEach(async () => {
  for (const id of brackets.splice(0)) {
    expect((await api("DELETE", `/api/seasons/${current}/brackets/${id}?force=true`, undefined, admin())).status).toBe(204);
  }
  for (const id of games.splice(0)) {
    if ((await game(id)).status === "final") expect((await undo(id)).status).toBe(204);
    await db.recursiveDelete(gameRef(id));
  }
});

async function createGame() {
  const response = await api("POST", `/api/seasons/${current}/matches`, {
    sportId: "1", matches: [{ startsAt: at(), homeCollegeId: "BF", awayCollegeId: "BK", venue: "Roster court", venueDetail: null }],
  }, admin());
  expect(response.status).toBe(201);
  games.push(response.body.matchIds[0]);
  return response.body.matchIds[0] as string;
}

/** A partial tournament isolates the semifinal's winner and loser destinations. */
async function createBracket() {
  const slots = [[13, "BK", "BR"], [15, "ES", "MC"], [16, "GH", "JE"]].map(([slot, home, away]) => ({
    slot, homeCollegeId: home, awayCollegeId: away, homeSeed: 2, awaySeed: 3,
    division: null, startsAt: at(), venue: "Roster cup court", venueDetail: null,
  }));
  const response = await api("POST", `/api/seasons/${current}/brackets`, {
    kind: "tournament", name: "Roster Policy Cup", sportId: "11", slots,
  }, admin());
  expect(response.status).toBe(201);
  brackets.push(response.body.id);
  const detail = (await api("GET", `/api/seasons/${current}/brackets/${response.body.id}`)).body as BracketDetail;
  const id = (slot: number) => detail.matches.find((m) => m.bracketSlot === slot)!.id;
  return { source: id(13), next: id(15), loserNext: id(16) };
}

/** Include every roster state, including removed players and attendance. */
async function populate(id: string, collegeId: string) {
  const match = await game(id);
  const college = COLLEGES.findIndex((c) => c.id === collegeId);
  const batch = db.batch();
  for (let i = 0; i < 4; i++) {
    const playerId = people.student(college, i + 3);
    const entry: RosterEntryDoc = {
      seasonId: current, matchId: id, sportId: match.sportId, startsAt: match.startsAt,
      collegeId, playerId, name: `Roster ${collegeId} ${i}`, addedBy: "self", addedByUser: playerId,
      signedUpAt: Timestamp.now(), captainStatus: i === 1 ? "confirmed" : i === 2 ? "removed" : null,
      captainBy: i === 1 || i === 2 ? people.admin : null,
      captainAt: i === 1 || i === 2 ? Timestamp.now() : null,
      present: i === 3, presentBy: i === 3 ? people.supervisor : null,
      presentAt: i === 3 ? Timestamp.now() : null,
    };
    batch.set(db.doc(paths.rosterEntry(current, id, playerId)), entry);
  }
  await batch.commit();
  return (await entries(id)).filter((e) => e.data.collegeId === collegeId);
}

async function entries(id: string) {
  return (await rosterRef(id).get()).docs.map((d) => ({ path: d.ref.path, data: d.data() as RosterEntryDoc }));
}

/** Large synthetic rosters exercise paging and the shared operation budget. */
async function fillRoster(id: string, collegeId: string, count: number) {
  const template = (await populate(id, collegeId))[0].data;
  await db.recursiveDelete(rosterRef(id));
  for (let offset = 0; offset < count; offset += 250) {
    const batch = db.batch();
    for (let i = offset; i < Math.min(offset + 250, count); i++) {
      const playerId = `budget-${i}`;
      batch.set(db.doc(paths.rosterEntry(current, id, playerId)), { ...template, playerId });
    }
    await batch.commit();
  }
  return entries(id);
}

async function latestAudit(action: string, matchId: string) {
  const logs = await db.collection(paths.auditLog(current)).where("action", "==", action).get();
  const snap = logs.docs.filter((d) => d.data().params.matchId === matchId)
    .sort((a, b) => b.data().at.toMillis() - a.data().at.toMillis())[0];
  expect(snap).toBeDefined();
  return snap!.data() as AuditLogDoc;
}

async function expectArchived(action: string, id: string, removed: Awaited<ReturnType<typeof entries>>) {
  const audit = await latestAudit(action, id);
  for (const entry of removed) {
    expect(audit.before[entry.path]).toEqual(entry.data);
    expect(audit.targets).toContain(entry.path);
    expect((await db.doc(entry.path).get()).exists).toBe(false);
  }
  return audit;
}

async function state(ids: string[]) {
  const [matches, rosters, colleges, teams, audit] = await Promise.all([
    db.getAll(...ids.map(gameRef)), Promise.all(ids.map(entries)),
    db.collection(paths.colleges(current)).get(),
    db.collectionGroup("teams").where("seasonId", "==", current).get(),
    db.collection(paths.auditLog(current)).count().get(),
  ]);
  return {
    matches: matches.map((d) => d.data()), rosters,
    standings: [...colleges.docs, ...teams.docs].sort((a, b) => a.ref.path.localeCompare(b.ref.path))
      .map((d) => ({ path: d.ref.path, data: d.data() })),
    audit: audit.data().count,
  };
}

describe("rosters follow match participants", () => {
  it.each([
    { field: "homeCollegeId", outgoing: "BF", retained: "BK", editor: people.admin },
    { field: "awayCollegeId", outgoing: "BK", retained: "BF", editor: people.supervisor },
  ])("replaces $field with a blank roster and preserves the other college", async ({ field, outgoing, retained, editor }) => {
    const id = await createGame();
    const removed = await populate(id, outgoing);
    const kept = await populate(id, retained);
    // An incoming team must start blank even if legacy invalid entries exist.
    const staleIncoming = await populate(id, "MC");
    const later = new Date((await game(id)).startsAt.toMillis() + 3600_000).toISOString();
    expect((await edit(id, { [field]: "MC", startsAt: later, venue: "New court" }, editor)).status).toBe(204);
    expect((await game(id))[field as "homeCollegeId" | "awayCollegeId"]).toBe("MC");
    const roster = await entries(id);
    expect(roster).toHaveLength(kept.length);
    for (const entry of kept) {
      expect(roster.find((e) => e.path === entry.path)?.data).toEqual({ ...entry.data, startsAt: Timestamp.fromDate(new Date(later)) });
    }
    const audit = await expectArchived("editMatch", id, [...removed, ...staleIncoming]);
    for (const entry of kept) expect(audit.before[entry.path]).toEqual(entry.data);
    const visible = await api("GET", `${gameUrl(id)}/roster/sheet`, undefined, admin());
    expect(visible.status).toBe(200);
    expect(visible.body.total).toBe(kept.length);
    expect(visible.body.items.every((e: { collegeId: string }) => e.collegeId === retained)).toBe(true);
  });

  it("erases both departing colleges, and returning teams start blank", async () => {
    const id = await createGame();
    const original = [...await populate(id, "BF"), ...await populate(id, "BK")];
    expect((await edit(id, { homeCollegeId: "MC", awayCollegeId: "ES" })).status).toBe(204);
    expect(await entries(id)).toEqual([]);
    await expectArchived("editMatch", id, original);
    const replacement = [...await populate(id, "MC"), ...await populate(id, "ES")];
    expect((await edit(id, { homeCollegeId: "BF", awayCollegeId: "BK" })).status).toBe(204);
    expect(await entries(id)).toEqual([]);
    await expectArchived("editMatch", id, replacement);
  });

  it("preserves both rosters on a home/away swap, a venue edit and cancellation/restoration", async () => {
    const id = await createGame();
    await populate(id, "BF");
    await populate(id, "BK");
    const before = await entries(id);
    for (const patch of [
      { homeCollegeId: "BK", awayCollegeId: "BF" }, { venue: "Another court" },
      { status: "cancelled" }, { status: "scheduled" },
    ]) {
      expect((await edit(id, patch)).status).toBe(204);
      expect(await entries(id)).toEqual(before);
    }
    const replacement = await createGame();
    expect(await entries(replacement)).toEqual([]);
  });

  it("rejects sport fields for every game state, including internal callers, without partial changes", async () => {
    const id = await createGame();
    await populate(id, "BF");
    for (const status of ["scheduled", "cancelled", "final"]) {
      if (status === "cancelled") expect((await edit(id, { status })).status).toBe(204);
      if (status === "final") {
        expect((await edit(id, { status: "scheduled" })).status).toBe(204);
        expect((await score(id)).status).toBe(204);
      }
      const before = await state([id]);
      for (const email of [people.admin, people.supervisor]) {
        for (const sportId of ["1", "2"]) {
          expect(await edit(id, { sportId, homeCollegeId: "MC", venue: "Must not change" }, email))
            .toMatchObject({ status: 400, body: { error: { code: "bad-request" } } });
        }
      }
      const editWithSport = { sportId: "2", homeCollegeId: "MC", venue: "Must not change" };
      await expect(editMatchService(current, id, editWithSport, actor)).rejects.toMatchObject({ code: "bad-request" });
      expect(await state([id])).toEqual(before);
    }
  });

  it("reconciles both bracket destinations and retains rosters on undo and same-winner rescore", async () => {
    const { source, next, loserNext } = await createBracket();
    const removed = [...await populate(next, "MC"), ...await populate(loserNext, "JE")];
    const keptNext = await populate(next, "ES");
    const keptLoser = await populate(loserNext, "GH");
    const stale = [...await populate(next, "BK"), ...await populate(loserNext, "BR")];
    expect((await score(source)).status).toBe(204);
    expect(await game(next)).toMatchObject({ homeCollegeId: "ES", awayCollegeId: "BK", awaySeed: 2 });
    expect(await game(loserNext)).toMatchObject({ homeCollegeId: "GH", awayCollegeId: "BR", awaySeed: 3 });
    expect(await entries(next)).toEqual(keptNext);
    expect(await entries(loserNext)).toEqual(keptLoser);
    await expectArchived("scoreMatch", source, [...removed, ...stale]);

    await populate(next, "BK");
    await populate(loserNext, "BR");
    const before = [await entries(next), await entries(loserNext)];
    expect((await undo(source)).status).toBe(204);
    expect([await entries(next), await entries(loserNext)]).toEqual(before);
    expect((await score(source)).status).toBe(204);
    expect([await entries(next), await entries(loserNext)]).toEqual(before);
    expect((await undo(source)).status).toBe(204);
    expect((await score(source, { ...result, homeScore: 0, awayScore: 2 })).status).toBe(204);
    expect(await entries(next)).toEqual(keptNext);
    expect(await entries(loserNext)).toEqual(keptLoser);
    await expectArchived("scoreMatch", source, before.flat().filter((e) => ["BK", "BR"].includes(e.data.collegeId)));
  });

  it("starts a newly filled TBD college blank while retaining the known opponent", async () => {
    const { source } = await createBracket();
    await gameRef(source).update({ homeCollegeId: null, collegeIds: ["BR"] });
    const kept = await populate(source, "BR");
    const stale = await populate(source, "BK");
    expect((await score(source, { ...result, homeCollegeId: "BK" })).status).toBe(204);
    expect(await entries(source)).toEqual(kept);
    await expectArchived("scoreMatch", source, stale);
  });

  it("rejects invalid edits and advancement into a scored destination without erasing any rosters", async () => {
    const id = await createGame();
    await populate(id, "BF");
    const before = await state([id]);
    for (const homeCollegeId of ["BK", "XX"]) {
      expect((await edit(id, { homeCollegeId })).status).toBe(400);
      expect(await state([id])).toEqual(before);
    }

    const { source, next, loserNext } = await createBracket();
    await populate(next, "MC");
    await populate(loserNext, "JE");
    expect((await score(next)).status).toBe(204);
    const bracketBefore = await state([source, next, loserNext]);
    expect(await score(source)).toMatchObject({
      status: 409, body: { error: { code: "conflict", details: { scoredMatchIds: [next] } } },
    });
    expect(await state([source, next, loserNext])).toEqual(bracketBefore);
  });

  it("pages a large roster and preserves every erased entry through the full audit reader", async () => {
    const id = await createGame();
    const removed = await fillRoster(id, "BF", 120);
    const kept = await populate(id, "BK");
    expect((await edit(id, { homeCollegeId: "MC" })).status).toBe(204);
    expect(await entries(id)).toEqual(kept);
    const audit = await expectArchived("editMatch", id, removed);
    expect(audit.targets).toHaveLength(removed.length + 1);
  });

  it.each(["roster first", "edit first"])("serializes a departing player's sign-up with a team replacement: %s", async (order) => {
    const id = await createGame();
    const email = people.student(0, 7);
    const signup = () => api("PUT", `${gameUrl(id)}/roster/me`, undefined, { session: sessionFor(email) });
    const replace = () => edit(id, { homeCollegeId: "MC" });
    const calls = order === "roster first" ? [signup(), replace()] : [replace(), signup()];
    const responses = await Promise.all(calls);
    const [signed, edited] = order === "roster first" ? responses : [responses[1], responses[0]];
    expect(edited.status).toBe(204);
    expect([204, 403]).toContain(signed.status);
    expect(await entries(id)).toEqual([]);
    expect(await game(id)).toMatchObject({ homeCollegeId: "MC", awayCollegeId: "BK" });
    if (signed.status === 204) {
      const audit = await latestAudit("editMatch", id);
      expect(audit.before[paths.rosterEntry(current, id, email)]).toMatchObject({ collegeId: "BF", playerId: email });
    }
  });

  it.each(["roster first", "score first"])("serializes a bracket replacement with the departing college's sign-up: %s", async (order) => {
    const { source, next } = await createBracket();
    const email = people.student(COLLEGES.findIndex((c) => c.id === "MC"), 7);
    const signup = () => api("PUT", `${gameUrl(next)}/roster/me`, undefined, { session: sessionFor(email) });
    const advance = () => score(source);
    const responses = await Promise.all(order === "roster first" ? [signup(), advance()] : [advance(), signup()]);
    const [signed, scored] = order === "roster first" ? responses : [responses[1], responses[0]];
    expect(scored.status).toBe(204);
    expect([204, 403]).toContain(signed.status);
    expect(await entries(next)).toEqual([]);
    expect(await game(next)).toMatchObject({ homeCollegeId: "ES", awayCollegeId: "BK" });
    if (signed.status === 204) {
      const audit = await latestAudit("scoreMatch", source);
      expect(audit.before[paths.rosterEntry(current, next, email)]).toMatchObject({ collegeId: "MC", playerId: email });
    }
  });

  it("preserves a simultaneous attendance update in the deletion audit or refuses it after deletion", async () => {
    const id = await createGame();
    const roster = await populate(id, "BF");
    const entry = roster[0];
    const [attendance, edited] = await Promise.all([
      api("PATCH", `/api/${entry.path}`, { present: true }, admin()), edit(id, { homeCollegeId: "MC" }),
    ]);
    expect(edited.status).toBe(204);
    expect([204, 404]).toContain(attendance.status);
    expect(await entries(id)).toEqual([]);
    const audit = await latestAudit("editMatch", id);
    expect(audit.before[entry.path]).toEqual(attendance.status === 204
      ? { ...entry.data, present: true, presentBy: people.admin, presentAt: expect.any(Timestamp) }
      : entry.data);
  });

  it("clears large replaced rosters while keeping the audit entry small", async () => {
    const { source, next, loserNext } = await createBracket();
    await fillRoster(next, "MC", 500);
    await fillRoster(loserNext, "JE", 500);
    try {
      expect((await score(source)).status).toBe(204);
      expect(await entries(next)).toEqual([]);
      expect(await entries(loserNext)).toEqual([]);
      const audit = await latestAudit("scoreMatch", source);
      expect(audit.before[paths.match(current, source)]).toMatchObject({ status: "scheduled" });
      expect(audit.truncated!.copies).toBeGreaterThan(0);
      expect(audit.targets.length + audit.truncated!.paths).toBeGreaterThan(1000);
    } finally {
      // Keep fixture teardown within the normal bracket-delete budget too.
      await db.recursiveDelete(rosterRef(next));
      await db.recursiveDelete(rosterRef(loserNext));
    }
  });
});
