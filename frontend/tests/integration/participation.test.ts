// Participation integrity (account plan, slice D): staff adds with an explicit
// side (rule 4a; R06: a refused add writes nothing, roles and the time are
// read again after the directory lookup), a game side never setting a
// college, self sign-up repairing a wrong-side entry, an admin's college
// change (4c), folding a leftover netid- account into an older one (R05,
// 4b), and attendance under review. The services run in-process against the
// emulator and the fake directory (fakeYalies.ts: "zzbf…" is a whole Benjamin
// Franklin record, "zz99…" can't be reached, other "zz…" aren't listed).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { paths } from "@/lib/paths";
import type { MatchDoc, TeamDoc } from "@/types/firestore";
import { api, db, people, seasons, sessionOf } from "./helpers";

const { addToGame } = await import("@/server/services/roster");
const { signUp } = await import("@/server/services/signups");
const { setPlayerCollege } = await import("@/server/services/affiliation");
const { claimPlaceholders } = await import("@/server/services/accounts");

let current: string;
beforeAll(async () => { ({ current } = await seasons()); });

// Every doc a test may create or change, restored after it (with the usernames of new accounts).
const saved = new Map<string, DocumentData | undefined>();
async function remember(...docPaths: string[]) {
  for (const path of docPaths) if (!saved.has(path)) saved.set(path, (await db.doc(path).get()).data());
}
afterEach(async () => {
  vi.restoreAllMocks();
  for (const [path, before] of saved) {
    const after = (await db.doc(path).get()).data();
    if (path.startsWith("users/") && !before && after?.username) await db.doc(paths.username(after.username)).delete();
    if (before) await db.doc(path).set(before);
    else await db.doc(path).delete();
  }
  saved.clear();
});

const supervisor = { userId: people.supervisor, roles: ["user", "supervisor"] };
const data = async (path: string) => (await db.doc(path).get()).data();

let sequence = 0;
/** A made-up NetID (its prefix picks the directory's answer) and the paths a test touches for it. */
async function person(prefix: string) {
  const netid = `${prefix}${++sequence}`;
  const id = `netid-${netid}`;
  await remember(paths.user(id), paths.player(current, id));
  return { netid, id };
}

/** An upcoming two-college regular game of `collegeId` (in the fake directory's college, BF, by default). */
async function upcomingGame(collegeId = "BF", skip = 0) {
  const games = await db.collection(paths.matches(current)).where("collegeIds", "array-contains", collegeId).where("startsAt", ">", new Date()).orderBy("startsAt").get();
  const game = games.docs.filter((g) => {
    const m = g.data() as MatchDoc;
    return m.stage === "regular" && m.collegeIds.length === 2 && m.status === "scheduled";
  })[skip];
  const match = game.data() as MatchDoc;
  return { id: game.id, match, other: match.collegeIds.find((c) => c !== collegeId)! };
}

/** Holds the next transaction before its first read (after the directory lookup), without timing-based sleeps. */
function holdTransaction() {
  let entered!: () => void, release!: () => void;
  const reached = new Promise<void>((resolve) => { entered = resolve; });
  const ready = new Promise<void>((resolve) => { release = resolve; });
  const original = db.runTransaction.bind(db);
  vi.spyOn(db, "runTransaction").mockImplementationOnce(async (...args) => {
    entered();
    await ready;
    return original(...args);
  });
  return { reached, release };
}

describe("staff adds (rule 4a)", () => {
  it("puts an unknown NetID on either side, unassigned, as an unclaimed account", async () => {
    const p = await person("zz99p"); // the directory can't be reached
    const game = await upcomingGame();
    await remember(paths.rosterEntry(current, game.id, p.id));
    const r = await addToGame(current, game.id, game.other, { netid: p.netid, name: "Walk In" }, supervisor);
    expect(r).toEqual({ status: "added", playerId: p.id, verified: false });
    expect(await data(paths.user(p.id))).toMatchObject({ netid: p.netid, name: null, nameSource: "none", claimedAt: null, createdBy: people.supervisor });
    expect(await data(paths.player(current, p.id))).toMatchObject({ collegeId: null, collegeHistory: [], userId: p.id, name: "Walk In", joinedVia: "supervisor" });
    expect(await data(paths.rosterEntry(current, game.id, p.id))).toMatchObject({ collegeId: game.other, name: "Walk In", present: true });

    // Still unassigned: another game's other side is fine too, by player id.
    const next = await upcomingGame("BF", 1);
    await remember(paths.rosterEntry(current, next.id, p.id));
    expect(await addToGame(current, next.id, "BF", { playerId: p.id }, supervisor)).toMatchObject({ status: "added" });
    expect((await data(paths.player(current, p.id)))!.collegeId).toBeNull();
  });

  it("puts someone the directory places in a college on that side only, and a refusal writes nothing", async () => {
    const p = await person("zzbf");
    const game = await upcomingGame();
    expect(await addToGame(current, game.id, game.other, { netid: p.netid, name: null }, supervisor)).toEqual({ status: "other-college", collegeId: "BF" });
    expect(await data(paths.user(p.id))).toBeUndefined();
    expect(await data(paths.player(current, p.id))).toBeUndefined();

    await remember(paths.rosterEntry(current, game.id, p.id));
    expect(await addToGame(current, game.id, "BF", { netid: p.netid, name: null }, supervisor)).toMatchObject({ status: "added", verified: true });
    expect(await data(paths.player(current, p.id))).toMatchObject({ collegeId: "BF", collegeHistory: [{ collegeId: "BF", source: "yalies", since: expect.any(Timestamp) }] });
    // Assigned now: the other side is refused by player id too.
    expect(await addToGame(current, game.id, game.other, { playerId: p.id }, supervisor)).toEqual({ status: "other-college", collegeId: "BF" });
  });

  it("refuses a cancelled game and a college that doesn't play", async () => {
    const game = await upcomingGame();
    await remember(`${paths.matches(current)}/${game.id}`);
    await db.doc(`${paths.matches(current)}/${game.id}`).update({ status: "cancelled" });
    const p = await person("zz99p");
    expect(await addToGame(current, game.id, "BF", { netid: p.netid, name: null }, supervisor)).toEqual({ status: "cancelled" });
    const notPlaying = ["BK", "BR", "DC"].find((c) => !game.match.collegeIds.includes(c))!;
    expect(await addToGame(current, game.id, notPlaying, { netid: p.netid, name: null }, supervisor)).toEqual({ status: "not-in-game" });
    expect(await data(paths.user(p.id))).toBeUndefined();
  });
});

describe("R06: the add's transaction reads the role and the time again", () => {
  it("refuses, writing nothing, when the caller stops being a supervisor during the lookup", async () => {
    const p = await person("zzbf");
    const game = await upcomingGame();
    await remember(paths.player(current, people.supervisor));
    const gate = holdTransaction();
    const add = addToGame(current, game.id, "BF", { netid: p.netid, name: null }, supervisor);
    try {
      await gate.reached;
      await db.doc(paths.player(current, people.supervisor)).update({ roles: [] });
    } finally { gate.release(); }
    expect(await add).toEqual({ status: "forbidden" });
    expect(await data(paths.user(p.id))).toBeUndefined();
    expect(await data(paths.rosterEntry(current, game.id, p.id))).toBeUndefined();
  });

  it("refuses a captain, writing nothing, when the game starts during the lookup", async () => {
    // A captain of a team with an upcoming game of its sport.
    const teams = (await db.collectionGroup("teams").where("seasonId", "==", current).get()).docs
      .map((t) => t.data() as TeamDoc).filter((t) => t.captainIds.length > 0);
    let found: { team: TeamDoc; gameId: string } | null = null;
    for (const team of teams) {
      const games = await db.collection(paths.matches(current)).where("collegeIds", "array-contains", team.collegeId).where("startsAt", ">", new Date()).get();
      const game = games.docs.find((g) => (g.data() as MatchDoc).sportId === team.sportId && (g.data() as MatchDoc).status === "scheduled");
      if (game) { found = { team, gameId: game.id }; break; }
    }
    const { team, gameId } = found!;
    const captain = { userId: team.captainIds[0], roles: ["user", "captain"] };
    const p = await person("zz99p");
    await remember(`${paths.matches(current)}/${gameId}`);
    const gate = holdTransaction();
    const add = addToGame(current, gameId, team.collegeId, { netid: p.netid, name: null }, captain);
    try {
      await gate.reached;
      await db.doc(`${paths.matches(current)}/${gameId}`).update({ startsAt: Timestamp.fromMillis(Date.now() - 60_000) });
    } finally { gate.release(); }
    expect(await add).toEqual({ status: "started" });
    expect(await data(paths.user(p.id))).toBeUndefined();
  });
});

describe("self sign-up", () => {
  it("needs a college, and moves an entry on the other side to their own", async () => {
    const p = await person("zz99p");
    const game = await upcomingGame();
    await remember(paths.rosterEntry(current, game.id, p.id));
    // Placed on the other side while unassigned; they can't sign themselves up yet.
    await addToGame(current, game.id, game.other, { netid: p.netid, name: "Walk In" }, supervisor);
    expect(await signUp(current, game.id, p.id)).toBe("unassigned");

    // An admin assigns BF: nothing of the old (no) college to withdraw; signing up moves the entry.
    expect(await setPlayerCollege(current, p.id, "BF", "Checked with the college", supervisor)).toBe("ok");
    expect(await signUp(current, game.id, p.id)).toBe("ok");
    expect(await data(paths.rosterEntry(current, game.id, p.id))).toMatchObject({ collegeId: "BF", addedBy: "self", present: false, captainStatus: null });
    expect(await signUp(current, game.id, p.id)).toBe("already-signed-up");
    const logs = (await db.collection(paths.auditLog(current)).where("action", "==", "signUpOnOwnSide").get()).docs.map((d) => d.data().params);
    expect(logs).toContainEqual({ matchId: game.id, playerId: p.id, from: game.other, to: "BF" });
  });
});

describe("an admin's college change (4c)", () => {
  it("ends the old college's roles, withdraws its upcoming sign-ups, keeps played games out of review", async () => {
    const p = await person("zz99p");
    // A college (not the directory's BF) with a game played and one to come.
    const games = (await db.collection(paths.matches(current)).get()).docs;
    const of = (c: string, when: (startsAt: number) => boolean) =>
      games.find((g) => (g.data() as MatchDoc).collegeIds.includes(c) && when((g.data() as MatchDoc).startsAt.toMillis()));
    const game0College = ["MC", "BK", "BR", "DC", "ES", "GH", "JE", "MY", "PC", "SY", "SM", "TD", "TC"]
      .find((c) => of(c, (t) => t < Date.now()) && of(c, (t) => t > Date.now()))!;
    const pastGame = of(game0College, (t) => t < Date.now())!;
    const upcomingDoc = of(game0College, (t) => t > Date.now())!;
    const upcoming = { id: upcomingDoc.id, match: upcomingDoc.data() as MatchDoc };
    const team = paths.team(current, game0College, "zz-sport");
    await remember(team, paths.rosterEntry(current, upcoming.id, p.id), paths.rosterEntry(current, pastGame.id, p.id));
    // A player of the college since long ago (a doc from before November 2026: no history), its rep and a captain.
    await db.doc(paths.user(p.id)).set({ email: null, name: "Old Player", nameSource: "self", netid: p.netid, username: `U${p.id}`, roles: [], claimedAt: Timestamp.fromMillis(1000), createdBy: null });
    await db.doc(paths.player(current, p.id)).set({ seasonId: current, collegeId: game0College, name: "Old Player", userId: p.id, roles: ["college_rep", "supervisor"], joinedAt: Timestamp.fromMillis(1000), joinedVia: "migration" });
    await db.doc(team).set({ seasonId: current, collegeId: game0College, sportId: "zz-sport", captainIds: [p.id, "someone-else"], games: 0, wins: 0, losses: 0, ties: 0, forfeits: 0, pointsFor: 0, pointsAgainst: 0 });
    const entry = (matchId: string, match: MatchDoc, present: boolean) => ({
      seasonId: current, matchId, sportId: match.sportId, collegeId: game0College, playerId: p.id, name: "Old Player", startsAt: match.startsAt,
      addedBy: "self", addedByUser: p.id, signedUpAt: null, captainStatus: null, captainBy: null, captainAt: null,
      present, presentBy: present ? people.supervisor : null, presentAt: null,
    });
    await db.doc(paths.rosterEntry(current, upcoming.id, p.id)).set(entry(upcoming.id, upcoming.match, false));
    await db.doc(paths.rosterEntry(current, pastGame.id, p.id)).set(entry(pastGame.id, pastGame.data() as MatchDoc, true));

    expect(await setPlayerCollege(current, p.id, "BF", "Moved colleges", supervisor)).toBe("ok");
    expect(await data(paths.player(current, p.id))).toMatchObject({
      collegeId: "BF",
      roles: ["supervisor"],
      collegeHistory: [
        { collegeId: game0College, source: "legacy", since: Timestamp.fromMillis(1000) },
        { collegeId: "BF", source: "admin", since: expect.any(Timestamp) },
      ],
    });
    expect((await data(team))!.captainIds).toEqual(["someone-else"]);
    expect(await data(paths.rosterEntry(current, upcoming.id, p.id))).toBeUndefined();
    expect(await data(paths.rosterEntry(current, pastGame.id, p.id))).toMatchObject({ present: true });
    expect(await setPlayerCollege(current, p.id, "BF", "again", supervisor)).toBe("unchanged");

    // The game played for the old college stays counted; one played for it now would be under review.
    const mine = await api("GET", `/api/me/matches?seasonId=${current}`, undefined, { session: sessionOf(p.id, p.netid) });
    expect(mine.status, JSON.stringify(mine.body)).toBe(200);
    expect(mine.body.items.find((m: { id: string }) => m.id === pastGame.id).mine).toEqual({ captainStatus: null, present: true, underReview: false });
    await db.doc(paths.player(current, p.id)).update({ collegeHistory: [{ collegeId: "BF", source: "admin", since: Timestamp.fromMillis(1000) }] });
    const later = await api("GET", `/api/me/matches?seasonId=${current}`, undefined, { session: sessionOf(p.id, p.netid) });
    expect(later.body.items.find((m: { id: string }) => m.id === pastGame.id).mine.underReview).toBe(true);
  });
});

describe("folding a leftover netid- account into an older one (R05)", () => {
  it("moves its entries, captaincies and MVP awards (one per week), then deletes it", async () => {
    const p = await person("zz99p");
    const older = `older.${p.netid}@yale.edu`;
    const game = await upcomingGame();
    const team = paths.team(current, "BF", "zz-sport");
    const awards = db.collection(paths.mvps(current, "BF"));
    const [own, dup, moved] = [awards.doc(), awards.doc(), awards.doc()];
    await remember(paths.user(older), paths.player(current, older), team, paths.rosterEntry(current, game.id, p.id), paths.rosterEntry(current, game.id, older), own.path, dup.path, moved.path);

    // Added while the directory was down; it's the person with an older account, NetID not recorded.
    await addToGame(current, game.id, "BF", { netid: p.netid, name: "Walk In" }, supervisor);
    const username = (await data(paths.user(p.id)))!.username;
    await db.doc(paths.user(older)).set({ email: older, name: "Older Name", nameSource: "yalies", netid: p.netid, username: `U${older}`, roles: [], claimedAt: Timestamp.fromMillis(1000), createdBy: null });
    await db.doc(team).set({ seasonId: current, collegeId: "BF", sportId: "zz-sport", captainIds: [p.id], games: 0, wins: 0, losses: 0, ties: 0, forfeits: 0, pointsFor: 0, pointsAgainst: 0 });
    // The placeholder's player doc has no college; captaincies and awards are found in the colleges it held.
    await db.doc(paths.player(current, p.id)).update({ collegeId: "BF", collegeHistory: [{ collegeId: "BF", source: "admin", since: Timestamp.fromMillis(1000) }] });
    const award = (playerId: string, week: number) => ({ seasonId: current, collegeId: "BF", week, playerId, name: "x", awardedBy: null, awardedAt: null });
    await own.set(award(older, 91));
    await dup.set(award(p.id, 91));
    await moved.set(award(p.id, 92));

    expect(await claimPlaceholders(p.netid, older, "Older Name")).toBe(1);
    expect(await data(paths.rosterEntry(current, game.id, p.id))).toBeUndefined();
    expect(await data(paths.rosterEntry(current, game.id, older))).toMatchObject({ playerId: older, name: "Older Name", collegeId: "BF", present: true });
    expect((await data(team))!.captainIds).toEqual([older]);
    expect(await data(own.path)).toMatchObject({ playerId: older, week: 91 });
    expect(await data(dup.path)).toBeUndefined();
    expect(await data(moved.path)).toMatchObject({ playerId: older, name: "Older Name", week: 92 });
    expect(await data(paths.player(current, older))).toMatchObject({ userId: older, collegeId: "BF" });
    expect(await data(paths.player(current, p.id))).toBeUndefined();
    expect(await data(paths.user(p.id))).toBeUndefined();
    expect(await data(paths.username(username))).toBeUndefined();
    // Again: nothing left to fold.
    expect(await claimPlaceholders(p.netid, older, "Older Name")).toBe(0);
  });
});
