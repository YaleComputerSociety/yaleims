// Admin resolution (account plan, slice E): a person's private review
// requests and the admins' queue, and the People view: finding a person,
// their season, and correcting their name, college and one game's attendance,
// each refused (409) when made on a stale revision.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { paths } from "@/lib/paths";
import type { MatchDoc } from "@/types/firestore";
import { api, db, people, seasons, sessionFor, sessionOf } from "./helpers";

let current: string;
beforeAll(async () => { ({ current } = await seasons()); });

// Every doc a test creates or changes, restored after it; and the requests it filed, deleted.
const saved = new Map<string, DocumentData | undefined>();
const filedBy: string[] = [];
async function remember(...docPaths: string[]) {
  for (const path of docPaths) if (!saved.has(path)) saved.set(path, (await db.doc(path).get()).data());
}
afterEach(async () => {
  for (const userId of filedBy.splice(0)) {
    for (const r of (await db.collection(paths.reviewRequests).where("subjectUserId", "==", userId).get()).docs) await r.ref.delete();
  }
  for (const [path, before] of saved) {
    if (before) await db.doc(path).set(before);
    else await db.doc(path).delete();
  }
  saved.clear();
});

const admin = () => sessionFor(people.admin);
const data = async (path: string) => (await db.doc(path).get()).data();

let sequence = 0;
/** A made-up signed-in person, a player of `collegeId` this season (null: unassigned); with a session. */
async function person(collegeId: string | null = null) {
  const netid = `zzrev${++sequence}`;
  const id = `netid-${netid}`;
  await remember(paths.user(id), paths.player(current, id));
  await db.doc(paths.user(id)).set({ email: null, name: "Rev Person", nameSource: "self", netid, roles: [], claimedAt: Timestamp.fromMillis(1000), createdBy: null });
  await db.doc(paths.player(current, id)).set({ seasonId: current, collegeId, collegeHistory: [], name: "Rev Person", userId: id, roles: [], joinedAt: Timestamp.fromMillis(1000), joinedVia: "login" });
  filedBy.push(id);
  return { netid, id, session: sessionOf(id, netid) };
}

/** A past game, with `p` recorded present on its `side` (default: its home college). */
async function attended(p: { id: string }, side?: string) {
  const game = (await db.collection(paths.matches(current)).where("startsAt", "<", new Date()).orderBy("startsAt", "desc").limit(1).get()).docs[0];
  const match = game.data() as MatchDoc;
  const path = paths.rosterEntry(current, game.id, p.id);
  await remember(path);
  await db.doc(path).set({
    seasonId: current, matchId: game.id, sportId: match.sportId, collegeId: side ?? match.collegeIds[0], playerId: p.id, name: "Rev Person",
    startsAt: match.startsAt, addedBy: "supervisor", addedByUser: people.supervisor, signedUpAt: null,
    captainStatus: null, captainBy: null, captainAt: null, present: true, presentBy: people.supervisor, presentAt: null,
  });
  return { matchId: game.id, match, path };
}

describe("review requests", () => {
  it("are filed once per thing, private to the person, and answered by an admin", async () => {
    const p = await person();
    const other = await person();
    const filed = await api("POST", "/api/me/review-requests", { kind: "affiliation", message: "I'm in Morse." }, { session: p.session });
    expect(filed.status).toBe(201);
    expect(await api("POST", "/api/me/review-requests", { kind: "affiliation", message: "Again" }, { session: p.session })).toEqual({ status: 200, body: { id: filed.body.id } });
    expect((await api("POST", "/api/me/review-requests", { kind: "attendance", matchId: "nope", message: "x" }, { session: p.session })).status).toBe(404);
    expect((await api("POST", "/api/me/review-requests", { kind: "affiliation", message: "<b>" }, { session: p.session })).status).toBe(400);
    // A game they're not listed on: described in the message.
    expect((await api("POST", "/api/me/review-requests", { kind: "attendance", message: "Played soccer on 11/3" }, { session: other.session })).status).toBe(201);

    const mine = await api("GET", "/api/me/review-requests", undefined, { session: p.session });
    expect(mine.body.items).toEqual([expect.objectContaining({ id: filed.body.id, kind: "affiliation", status: "open", message: "I'm in Morse.", resolution: null })]);
    expect(mine.body.items[0]).not.toHaveProperty("openKey");
    expect((await api("GET", "/api/me/review-requests", undefined, { session: other.session })).body.items.map((r: { kind: string }) => r.kind)).toEqual(["attendance"]);
    expect((await api("GET", "/api/review-requests", undefined, { session: p.session })).status).toBe(403);

    const queue = await api("GET", "/api/review-requests", undefined, { session: admin() });
    const queued = queue.body.items.find((r: { id: string }) => r.id === filed.body.id);
    expect(queued).toMatchObject({ subject: { userId: p.id, name: "Rev Person", netid: p.netid }, revision: expect.any(String) });
    const close = (revision: string) =>
      api("PATCH", `/api/review-requests/${filed.body.id}`, { status: "resolved", resolution: "Set to Morse.", revision }, { session: admin() });
    expect((await close("1.000000000")).status).toBe(409);
    expect((await close(queued.revision)).status).toBe(204);
    expect((await close(queued.revision)).status).toBe(409);
    expect((await api("GET", "/api/me/review-requests", undefined, { session: p.session })).body.items[0]).toMatchObject({ status: "resolved", resolution: "Set to Morse." });
    // Closed: a new one may be filed.
    const again = await api("POST", "/api/me/review-requests", { kind: "affiliation", message: "Still wrong" }, { session: p.session });
    expect(again.status).toBe(201);
    expect(again.body.id).not.toBe(filed.body.id);
  });

  it("close when their game is deleted", async () => {
    const p = await person();
    const sport = (await db.collection(paths.sports(current)).limit(1).get()).docs[0].id;
    const startsAt = new Date(Date.now() + 40 * 86400_000).toISOString();
    const made = await api("POST", `/api/seasons/${current}/matches`, { sportId: sport, matches: [{ startsAt, homeCollegeId: "BF", awayCollegeId: "BK", venue: "Test", venueDetail: null }] }, { session: sessionFor(people.supervisor) });
    const matchId = made.body.matchIds[0];
    const filed = await api("POST", "/api/me/review-requests", { kind: "attendance", matchId, message: "I'll be there" }, { session: p.session });
    expect(filed.status).toBe(201);
    expect((await api("DELETE", `/api/seasons/${current}/matches/${matchId}`, undefined, { session: sessionFor(people.supervisor) })).status).toBe(204);
    expect(await data(paths.reviewRequest(filed.body.id))).toMatchObject({ status: "dismissed", openKey: null, resolution: expect.stringContaining("deleted") });
  });
});

describe("People", () => {
  it("finds a person by NetID and lists those without a college", async () => {
    const p = await person();
    expect((await api("GET", `/api/people?netid=${p.netid.toUpperCase()}`, undefined, { session: admin() })).body.items).toEqual([
      { userId: p.id, netid: p.netid, name: "Rev Person", claimed: true, collegeId: null, inSeason: true },
    ]);
    const unassigned = await api("GET", "/api/people?list=unassigned", undefined, { session: admin() });
    expect(unassigned.body.items.map((x: { userId: string }) => x.userId)).toContain(p.id);
    expect((await api("GET", "/api/people?list=everyone", undefined, { session: admin() })).status).toBe(400);
  });

  it("corrects a name (locked from then on), refusing a stale revision", async () => {
    const p = await person();
    const view = (await api("GET", `/api/people/${p.id}?seasonId=${current}`, undefined, { session: admin() })).body;
    expect(view).toMatchObject({ userId: p.id, nameSource: "self", season: { roles: [] }, games: [] });
    const fix = (revision: string) => api("PATCH", `/api/people/${p.id}`, { name: "Right Name", reason: "Asked by email", revision }, { session: admin() });
    expect((await fix(view.revision)).status).toBe(204);
    expect((await fix(view.revision)).status).toBe(409);
    expect(await data(paths.user(p.id))).toMatchObject({ name: "Right Name", nameSource: "admin" });
    expect((await data(paths.player(current, p.id)))!.name).toBe("Right Name");
    expect((await api("PATCH", "/api/me", { name: "Mine" }, { session: p.session })).status).toBe(403);
  });

  it("gives an admin-set name back to the person to change (D-N4)", async () => {
    const p = await person();
    const revision = async () => (await api("GET", `/api/people/${p.id}?seasonId=${current}`, undefined, { session: admin() })).body.revision;
    const fix = async (body: object) => api("PATCH", `/api/people/${p.id}`, { ...body, reason: "Checked", revision: await revision() }, { session: admin() });
    expect((await fix({ name: "Right Name", unlockName: true })).status).toBe(400);
    expect((await fix({ name: "Right Name" })).status).toBe(204);
    expect((await fix({ unlockName: true })).status).toBe(204);
    expect(await data(paths.user(p.id))).toMatchObject({ name: "Right Name", nameSource: "self" });
    expect((await api("PATCH", "/api/me", { name: "Mine" }, { session: p.session })).status).toBe(204);
  });

  it("sets a college with the player doc's revision", async () => {
    const p = await person();
    const view = (await api("GET", `/api/people/${p.id}?seasonId=${current}`, undefined, { session: admin() })).body;
    const set = (collegeId: string | null, revision: string | null) =>
      api("PUT", `/api/people/${p.id}/college`, { seasonId: current, collegeId, reason: "Checked", revision }, { session: admin() });
    expect((await set("BF", null)).status).toBe(409);
    expect((await set("BF", view.season.revision)).status).toBe(204);
    expect(await data(paths.player(current, p.id))).toMatchObject({ collegeId: "BF", collegeHistory: [{ collegeId: "BF", source: "admin", since: expect.any(Timestamp) }] });
  });

  it("confirms attendance under review, moves an entry to the right person, and removes one", async () => {
    // Recorded at a game for a college they didn't hold: under review.
    const p = await person("BF");
    await db.doc(paths.player(current, p.id)).update({ collegeHistory: [{ collegeId: "BF", source: "yalies", since: Timestamp.fromMillis(1000) }] });
    const game = await attended(p, "MC");
    const view = async () => (await api("GET", `/api/people/${p.id}?seasonId=${current}`, undefined, { session: admin() })).body;
    const before = (await view()).games[0];
    expect(before).toMatchObject({ matchId: game.matchId, collegeId: "MC", present: true, underReview: true, confirmedByAdmin: false });
    const fix = (body: object) => api("PATCH", `/api/people/${p.id}/attendance/${game.matchId}`, { seasonId: current, ...body }, { session: admin() });
    expect((await fix({ action: "confirm", confirmed: true, revision: before.revision })).status).toBe(204);
    const confirmed = (await view()).games[0];
    expect(confirmed).toMatchObject({ underReview: false, confirmedByAdmin: true });
    expect((await api("GET", `/api/me/matches?seasonId=${current}`, undefined, { session: p.session })).body.items[0].mine.underReview).toBe(false);

    // A mistyped NetID: the entry belongs to someone else.
    const right = await person("MC");
    expect((await fix({ action: "reassign", netid: "zznobody1", reason: "Typo", revision: confirmed.revision })).status).toBe(404);
    expect((await fix({ action: "reassign", netid: right.netid, reason: "Typo", revision: before.revision })).status).toBe(409);
    await remember(paths.rosterEntry(current, game.matchId, right.id));
    expect((await fix({ action: "reassign", netid: right.netid, reason: "Typo", revision: confirmed.revision })).status).toBe(204);
    expect(await data(game.path)).toBeUndefined();
    expect(await data(paths.rosterEntry(current, game.matchId, right.id))).toMatchObject({ playerId: right.id, collegeId: "MC", present: true, attendanceConfirmedBy: null });

    const moved = (await api("GET", `/api/people/${right.id}?seasonId=${current}`, undefined, { session: admin() })).body.games[0];
    const remove = (revision: string) => api("PATCH", `/api/people/${right.id}/attendance/${game.matchId}`, { seasonId: current, action: "remove", reason: "Wasn't there", revision }, { session: admin() });
    expect((await remove(moved.revision)).status).toBe(204);
    expect((await remove(moved.revision)).status).toBe(404);
    const logs = (await db.collection(paths.auditLog(current)).where("action", "in", ["confirmAttendance", "reassignRosterEntry", "removeRosterEntry"]).get()).docs.map((d) => d.data().params);
    expect(logs).toContainEqual(expect.objectContaining({ userId: right.id, matchId: game.matchId, reason: "Wasn't there" }));
  });
});
