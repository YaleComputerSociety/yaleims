// Domain rules must hold for full requests, partial edits and concurrent writers.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { BracketDetail } from "@/lib/api/brackets";
import { paths } from "@/lib/paths";
import { api, db, people, seasons, sessionFor } from "./helpers";

vi.mock("server-only", () => ({}));
const { addSchedule } = await import("@/server/services/schedule");

let current: string;
const games: string[] = [];
const brackets: string[] = [];
const actor = { userId: people.admin, roles: ["admin"] };
const admin = () => ({ session: sessionFor(people.admin) });
const at = () => new Date(Date.now() + 35 * 86400_000).toISOString();
const row = (home = "BF", away = "BK") => ({ startsAt: at(), homeCollegeId: home, awayCollegeId: away, venue: "Invariant court", venueDetail: null });
const result = { homeScore: 2, awayScore: 0, homeForfeit: false, awayForfeit: false };
const gameUrl = (id: string) => `/api/seasons/${current}/matches/${id}`;
const score = (id: string, body: object = result) => api("PUT", `${gameUrl(id)}/result`, body, admin());
const edit = (id: string, body: object) => api("PATCH", gameUrl(id), body, admin());

beforeAll(async () => { ({ current } = await seasons()); });

afterEach(async () => {
  for (const id of brackets.splice(0)) {
    expect((await api("DELETE", `/api/seasons/${current}/brackets/${id}?force=true`, undefined, admin())).status).toBe(204);
  }
  for (const id of games.splice(0)) {
    const ref = db.doc(paths.match(current, id));
    if ((await ref.get()).data()?.status === "final") {
      expect((await api("DELETE", `${gameUrl(id)}/result`, undefined, admin())).status).toBe(204);
    }
    await db.recursiveDelete(ref);
  }
});

async function createGame() {
  const response = await api("POST", `/api/seasons/${current}/matches`, { sportId: "1", matches: [row()] }, admin());
  expect(response.status).toBe(201);
  const id = response.body.matchIds[0] as string;
  games.push(id);
  return id;
}

async function snapshot(id?: string) {
  const [colleges, teams, audit, game] = await Promise.all([
    db.collection(paths.colleges(current)).get(),
    db.collectionGroup("teams").where("seasonId", "==", current).get(),
    db.collection(paths.auditLog(current)).count().get(),
    id ? db.doc(paths.match(current, id)).get() : null,
  ]);
  const docs = [...colleges.docs, ...teams.docs].sort((a, b) => a.ref.path.localeCompare(b.ref.path));
  return { game: game?.data(), standings: docs.map((d) => ({ path: d.ref.path, data: d.data() })), audit: audit.data().count };
}

async function createBracket(slots: object[] = []): Promise<BracketDetail> {
  const response = await api("POST", `/api/seasons/${current}/brackets`, {
    kind: "tournament", name: "Invariant Cup", sportId: "1", slots,
  }, admin());
  expect(response.status).toBe(201);
  brackets.push(response.body.id);
  return (await api("GET", `/api/seasons/${current}/brackets/${response.body.id}`)).body;
}

const slot = (n: number, home: string | null, away: string | null = null) => ({
  slot: n, homeCollegeId: home, awayCollegeId: away, homeSeed: null, awaySeed: null,
  division: null, startsAt: at(), venue: null, venueDetail: null,
});

describe("server match invariants", () => {
  it("rejects a whole schedule containing a college playing itself", async () => {
    const before = await snapshot();
    const count = (await db.collection(paths.matches(current)).count().get()).data().count;
    const response = await api("POST", `/api/seasons/${current}/matches`, {
      sportId: "1", matches: [row(), row("BF", "BF")],
    }, admin());
    // Track any incorrectly accepted rows so the red test leaves no games behind.
    if (response.status === 201) games.push(...response.body.matchIds);
    expect(response).toMatchObject({ status: 400, body: { error: { code: "bad-request" } } });
    expect(response.body.error.message).toContain("different colleges");
    expect((await db.collection(paths.matches(current)).count().get()).data().count).toBe(count);
    expect(await snapshot()).toEqual(before);
  });

  it("enforces opponents for internal schedule callers as well as HTTP", async () => {
    const before = await snapshot();
    const response = await addSchedule(current, "1", [row("BF", "BF")], actor);
    if (response.status === "added") games.push(...response.matchIds);
    expect(response).toMatchObject({ status: "bad-rows" });
    expect(await snapshot()).toEqual(before);
  });

  it.each([{ homeCollegeId: "BK" }, { awayCollegeId: "BF" }])("validates a partial edit against the stored opponent: %s", async (patch) => {
    const id = await createGame();
    const before = await snapshot(id);
    expect(await edit(id, patch)).toMatchObject({ status: 400, body: { error: { code: "bad-request" } } });
    expect(await snapshot(id)).toEqual(before);
    expect((await edit(id, { homeCollegeId: "BK", awayCollegeId: "BF" })).status).toBe(204);
    expect((await db.doc(paths.match(current, id)).get()).data()).toMatchObject({ homeCollegeId: "BK", awayCollegeId: "BF", collegeIds: ["BK", "BF"] });
  });

  it("refuses a stored self-match until it is repaired", async () => {
    const id = await createGame();
    await db.doc(paths.match(current, id)).update({ awayCollegeId: "BF", collegeIds: ["BF"] });
    const before = await snapshot(id);
    expect((await score(id)).status).toBe(400);
    expect(await snapshot(id)).toEqual(before);
    expect((await edit(id, { awayCollegeId: "BK" })).status).toBe(204);
    expect((await score(id)).status).toBe(204);
  });

  it("requires restoring a cancelled game and undoing a final result before cancellation", async () => {
    const id = await createGame();
    expect((await edit(id, { status: "cancelled" })).status).toBe(204);
    const before = await snapshot(id);
    expect(await score(id)).toMatchObject({ status: 409, body: { error: { code: "conflict" } } });
    expect(await snapshot(id)).toEqual(before);
    expect((await edit(id, { status: "scheduled" })).status).toBe(204);
    expect((await score(id)).status).toBe(204);
    const final = await snapshot(id);
    expect((await edit(id, { status: "cancelled" })).status).toBe(409);
    expect((await edit(id, { homeCollegeId: "BR" })).status).toBe(409);
    expect((await edit(id, { sportId: "2" })).status).toBe(409);
    expect(await snapshot(id)).toEqual(final);
    expect((await edit(id, { venue: "Updated court" })).status).toBe(204);
    expect((await api("DELETE", `${gameUrl(id)}/result`, undefined, admin())).status).toBe(204);
    expect((await edit(id, { status: "cancelled" })).status).toBe(204);
  });

  it.each(["XX", null])("refuses an invalid stored regular-game opponent until repaired: %s", async (home) => {
    const id = await createGame();
    await db.doc(paths.match(current, id)).update({ homeCollegeId: home, collegeIds: home ? [home, "BK"] : ["BK"] });
    const before = await snapshot(id);
    expect((await edit(id, { venue: "Another court" })).status).toBe(400);
    expect((await score(id)).status).toBe(400);
    expect(await snapshot(id)).toEqual(before);
    expect((await edit(id, { homeCollegeId: "BF" })).status).toBe(204);
    expect((await score(id)).status).toBe(204);
  });

  it("checks resulting opponents again when concurrent edits retry", async () => {
    const id = await createGame();
    const before = await snapshot(id);
    const responses = await Promise.all([edit(id, { homeCollegeId: "BR" }), edit(id, { awayCollegeId: "BR" })]);
    expect(responses.map((r) => r.status).sort()).toEqual([204, 400]);
    const after = await snapshot(id);
    expect(after.game!.homeCollegeId).not.toBe(after.game!.awayCollegeId);
    expect(after.standings).toEqual(before.standings);
    expect(after.audit).toBe(before.audit + 1);
  });

  it("serializes cancellation and scoring without a cancelled game gaining points", async () => {
    const id = await createGame();
    const before = await snapshot(id);
    const [cancelled, scored] = await Promise.all([edit(id, { status: "cancelled" }), score(id)]);
    expect([cancelled.status, scored.status].sort()).toEqual([204, 409]);
    const game = (await db.doc(paths.match(current, id)).get()).data()!;
    expect(game.status).toBe(scored.status === 204 ? "final" : "cancelled");
    expect(game.result).toEqual(scored.status === 204 ? { homeScore: 2, awayScore: 0, outcome: "home", forfeit: false } : null);
    const after = await snapshot(id);
    if (cancelled.status === 204) {
      expect(after.standings).toEqual(before.standings);
    } else {
      const college = (s: typeof before, id: string) => s.standings.find((d) => d.path === paths.college(current, id))!.data;
      expect(college(after, "BF")).toMatchObject({ points: college(before, "BF").points + game.pointsForWin, wins: college(before, "BF").wins + 1 });
      expect(college(after, "BK")).toMatchObject({ points: college(before, "BK").points, losses: college(before, "BK").losses + 1 });
    }
    const logs = await db.collection(paths.auditLog(current)).where("targets", "array-contains", paths.match(current, id)).get();
    const actions = logs.docs.map((d) => d.data().action);
    expect(actions.filter((a) => a === "scoreMatch")).toHaveLength(scored.status === 204 ? 1 : 0);
    expect(actions.filter((a) => a === "editMatch")).toHaveLength(cancelled.status === 204 ? 1 : 0);
  });

  it("preserves byes and pending games while checking scoring-time college overrides", async () => {
    const bracket = await createBracket([slot(1, "BF")]);
    expect(bracket.slots.find((s) => s.slot === 1)).toMatchObject({ matchId: null, byeCollegeId: "BF" });
    const quarter = bracket.matches.find((m) => m.bracketSlot === 5)!;
    expect(quarter).toMatchObject({ homeCollegeId: null, awayCollegeId: "BF" });
    expect((await edit(quarter.id, { venue: "Pending court" })).status).toBe(204);
    const before = await snapshot(quarter.id);
    expect((await score(quarter.id)).status).toBe(400);
    expect((await score(quarter.id, { ...result, homeCollegeId: "BF" })).status).toBe(400);
    expect(await snapshot(quarter.id)).toEqual(before);
    expect((await score(quarter.id, { ...result, homeCollegeId: "BK" })).status).toBe(204);
  });

  it("rejects a self-match introduced by an inherited bye before creating a bracket", async () => {
    const before = await snapshot();
    const response = await api("POST", `/api/seasons/${current}/brackets`, {
      kind: "tournament", name: "Invalid Invariant Cup", sportId: "1", slots: [slot(1, "BF"), slot(5, "BF")],
    }, admin());
    if (response.status === 201) brackets.push(response.body.id);
    expect(response.status).toBe(400);
    expect((await db.doc(paths.bracket(current, "invalid-invariant-cup")).get()).exists).toBe(false);
    expect(await snapshot()).toEqual(before);
  });

  it("rejects advancement that would make the next game a self-match atomically", async () => {
    const bracket = await createBracket([slot(1, "BF"), slot(2, "BK", "BR")]);
    const source = bracket.matches.find((m) => m.bracketSlot === 2)!;
    const next = bracket.matches.find((m) => m.bracketSlot === 5)!;
    await db.doc(paths.match(current, next.id)).update({ awayCollegeId: "BK", collegeIds: ["BK"] });
    const before = await snapshot(source.id);
    const nextBefore = (await db.doc(paths.match(current, next.id)).get()).data();
    expect(await score(source.id)).toMatchObject({ status: 409, body: { error: { code: "conflict" } } });
    expect(await snapshot(source.id)).toEqual(before);
    expect((await db.doc(paths.match(current, next.id)).get()).data()).toEqual(nextBefore);
  });
});
