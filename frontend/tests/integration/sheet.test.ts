// The roster sheet (D34): captains prepare their side until the start,
// supervisors take attendance at any time; and cancelling and deleting games.
import { beforeAll, describe, expect, it } from "vitest";
import { FieldValue } from "firebase-admin/firestore";
import type { MatchDoc, TeamDoc } from "@/types/firestore";
import { api, db, people, seasons, sessionFor } from "./helpers";

let current: string;
beforeAll(async () => {
  ({ current } = await seasons());
});
const supervisor = () => sessionFor(people.supervisor);
const player = (college: number, position: number) => people.student(college, position);

/** A captain with an upcoming regular game of their team: the captain, the game and the other side. */
async function captainWithGame() {
  const teams = (await db.collectionGroup("teams").where("seasonId", "==", current).get()).docs
    .map((t) => t.data() as TeamDoc)
    .filter((t) => t.captainIds.length > 0);
  for (const { collegeId, sportId, captainIds } of teams) {
    const games = await db
      .collection(`seasons/${current}/matches`)
      .where("collegeIds", "array-contains", collegeId)
      .where("startsAt", ">", new Date())
      .orderBy("startsAt")
      .get();
    const game = games.docs.find((g) => {
      const m = g.data() as MatchDoc;
      return m.sportId === sportId && m.stage === "regular" && m.collegeIds.length === 2;
    });
    if (game) {
      const other = (game.data() as MatchDoc).collegeIds.find((c) => c !== collegeId)!;
      return { captain: captainIds[0], collegeId, other, game, path: `/api/seasons/${current}/matches/${game.id}/roster` };
    }
  }
  throw new Error("The seed has no captain with an upcoming game");
}

/** A season player of `collegeId` who isn't on `matchId`'s roster (nor one of `except`). */
async function playerNotOn(matchId: string, collegeId: string, except: string[] = []): Promise<string> {
  const players = await db.collection(`seasons/${current}/players`).where("collegeId", "==", collegeId).get();
  for (const p of players.docs) {
    if (p.id.startsWith("guest-") || except.includes(p.id)) continue;
    if (!(await db.doc(`seasons/${current}/matches/${matchId}/roster/${p.id}`).get()).exists) return p.id;
  }
  throw new Error(`Everyone of ${collegeId} is on ${matchId}`);
}

describe("GET …/roster/sheet", () => {
  it("is for the side's captain (their side) and supervisors (both sides), with ids", async () => {
    const { captain, collegeId, other, path } = await captainWithGame();
    expect((await api("GET", `${path}/sheet`)).status).toBe(401);
    expect((await api("GET", `${path}/sheet`, undefined, { session: sessionFor(player(13, 7)) })).status).toBe(403);

    const mine = await api("GET", `${path}/sheet`, undefined, { session: sessionFor(captain) });
    expect(mine.status).toBe(200);
    expect(mine.body).toMatchObject({ collegeIds: [collegeId], supervisor: false, captainOf: [collegeId] });
    for (const e of mine.body.items) expect(e).toMatchObject({ collegeId, playerId: expect.any(String) });

    const all = await api("GET", `${path}/sheet`, undefined, { session: supervisor() });
    expect(all.body).toMatchObject({ supervisor: true, captainOf: [] });
    expect([...all.body.collegeIds].sort()).toEqual([collegeId, other].sort());
    // Names and NetIDs for every editor; emails for admins only.
    for (const e of all.body.items) expect(e).not.toHaveProperty("email");
    const asAdmin = await api("GET", `${path}/sheet`, undefined, { session: sessionFor(people.admin) });
    for (const e of asAdmin.body.items) expect(e).toMatchObject({ name: expect.any(String), email: e.playerId.includes("@") ? e.playerId : null });
  });
});

describe("co-captains", () => {
  it("share one call per player: the last one counts, and the sheet names who made it", async () => {
    const { captain, collegeId, game, path } = await captainWithGame();
    const team = db.doc(`seasons/${current}/colleges/${collegeId}/teams/${(game.data() as MatchDoc).sportId}`);
    const signedUp = await playerNotOn(game.id, collegeId);
    expect((await api("PUT", `/api/seasons/${current}/matches/${game.id}/roster/me`, undefined, { session: sessionFor(signedUp) })).status).toBe(204);
    const coCaptain = await playerNotOn(game.id, collegeId, [captain]); // not the one just signed up
    await team.update({ captainIds: FieldValue.arrayUnion(coCaptain) });
    const entry = `${path}/${encodeURIComponent(signedUp)}`;
    const callOf = async (viewer: string) =>
      (await api("GET", `${path}/sheet`, undefined, { session: sessionFor(viewer) })).body.items.find((e: { playerId: string }) => e.playerId === signedUp);
    const nameOf = async (id: string) => (await db.doc(`users/${id}`).get()).data()!.name;

    expect(await callOf(coCaptain)).toMatchObject({ captainStatus: null, captainCall: null });
    expect((await api("PATCH", entry, { captainStatus: "confirmed" }, { session: sessionFor(captain) })).status).toBe(204);
    expect(await callOf(coCaptain)).toMatchObject({ captainStatus: "confirmed", captainCall: { by: "captain", name: await nameOf(captain) } });
    expect((await api("PATCH", entry, { captainStatus: "removed" }, { session: sessionFor(coCaptain) })).status).toBe(204);
    expect(await callOf(captain)).toMatchObject({ captainStatus: "removed", captainCall: { by: "captain", name: await nameOf(coCaptain) } });

    // Supervisors confirm who came, before the start too, but never pre-confirm (the captains' call), nor take a pre-confirmation back.
    expect((await api("PATCH", entry, { captainStatus: "confirmed" }, { session: supervisor() }))).toMatchObject({ status: 403, body: { error: { message: "Only the team's captains pre-confirm players; supervisors confirm who came." } } });
    expect((await api("PATCH", entry, { captainStatus: "confirmed" }, { session: sessionFor(captain) })).status).toBe(204);
    expect((await api("PATCH", entry, { captainStatus: null }, { session: supervisor() })).status).toBe(403);
    expect((game.data() as MatchDoc).startsAt.toMillis()).toBeGreaterThan(Date.now());
    expect((await api("PATCH", entry, { present: true }, { session: supervisor() })).status).toBe(204);
    expect((await db.doc(`seasons/${current}/matches/${game.id}/roster/${signedUp}`).get()).data()).toMatchObject({ captainStatus: "confirmed", present: true });
    // A supervisor's take-off: by role for captains, by name for staff; no caller ids on the sheet or in the player's own entry.
    // Taking off clears the presence (a player taken off didn't play) and keeps what it replaced.
    const stored = db.doc(`seasons/${current}/matches/${game.id}/roster/${signedUp}`);
    expect((await api("PATCH", entry, { captainStatus: "removed", present: true }, { session: supervisor() })).status).toBe(409);
    expect((await api("PATCH", entry, { captainStatus: "removed" }, { session: supervisor() })).status).toBe(204);
    expect((await stored.get()).data()).toMatchObject({
      captainStatus: "removed", captainByRole: "supervisor", present: false,
      beforeTakeOff: { captainStatus: "confirmed", captainBy: captain, captainByRole: "captain", present: true, presentBy: people.supervisor },
    });
    const call = await callOf(captain);
    expect(call.captainCall).toEqual({ by: "supervisor", name: null });
    expect((await callOf(people.supervisor)).captainCall).toEqual({ by: "supervisor", name: await nameOf(people.supervisor) });
    for (const field of ["captainBy", "captainByRole", "presentBy", "beforeTakeOff"]) expect(call).not.toHaveProperty(field);
    const own = await api("GET", path, undefined, { session: sessionFor(signedUp) });
    expect(own.body.mine).toMatchObject({ captainStatus: "removed", present: false });
    for (const field of ["captainBy", "captainByRole", "presentBy", "beforeTakeOff"]) expect(own.body.mine).not.toHaveProperty(field);
    // Taken off: not marked present until put back; putting back restores the captain's pre-confirmation and the presence.
    expect((await api("PATCH", entry, { present: true }, { session: supervisor() }))).toMatchObject({ status: 409, body: { error: { message: "They're taken off this game: put them back first." } } });
    expect((await api("PATCH", entry, { captainStatus: null }, { session: supervisor() })).status).toBe(204);
    const restored = (await stored.get()).data()!;
    expect(restored).toMatchObject({ captainStatus: "confirmed", captainBy: captain, captainByRole: "captain", present: true });
    expect(restored).not.toHaveProperty("beforeTakeOff");
    expect(await callOf(coCaptain)).toMatchObject({ captainCall: { by: "captain", name: await nameOf(captain) } });
    // A call from before the role was stored: a current captain's is theirs, anyone else's a supervisor's.
    await stored.update({ captainByRole: FieldValue.delete(), captainBy: coCaptain });
    expect((await callOf(captain)).captainCall).toEqual({ by: "captain", name: await nameOf(coCaptain) });
    await stored.update({ captainBy: people.supervisor });
    expect((await callOf(captain)).captainCall).toEqual({ by: "supervisor", name: null });

    // A captain who signs up for their team's game is confirmed at once, by themselves.
    expect((await api("PUT", `/api/seasons/${current}/matches/${game.id}/roster/me`, undefined, { session: sessionFor(coCaptain) })).status).toBe(204);
    const self = (await api("GET", `${path}/sheet`, undefined, { session: sessionFor(captain) })).body.items.find((e: { playerId: string }) => e.playerId === coCaptain);
    expect(self).toMatchObject({ addedBy: "self", captainStatus: "confirmed", captainCall: { by: "captain", name: await nameOf(coCaptain) } });
    await db.doc(`seasons/${current}/matches/${game.id}/roster/${coCaptain}`).delete();

    await db.doc(`seasons/${current}/matches/${game.id}/roster/${signedUp}`).delete();
    await team.update({ captainIds: FieldValue.arrayRemove(coCaptain) });
  });
});

describe("a supervisor who captains the side", () => {
  it("acts as its captain until the start (pre-confirms, adds as the captain) and as a supervisor at any time", async () => {
    const { collegeId, game, path } = await captainWithGame();
    const team = db.doc(`seasons/${current}/colleges/${collegeId}/teams/${(game.data() as MatchDoc).sportId}`);
    await team.update({ captainIds: FieldValue.arrayUnion(people.supervisor) });
    const as = { session: supervisor() };
    expect((await api("GET", `${path}/sheet`, undefined, as)).body).toMatchObject({ supervisor: true, captainOf: [collegeId] });

    const signedUp = await playerNotOn(game.id, collegeId);
    expect((await api("PUT", `/api/seasons/${current}/matches/${game.id}/roster/me`, undefined, { session: sessionFor(signedUp) })).status).toBe(204);
    const stored = db.doc(`seasons/${current}/matches/${game.id}/roster/${signedUp}`);
    expect((await api("PATCH", `${path}/${encodeURIComponent(signedUp)}`, { captainStatus: "confirmed" }, as)).status).toBe(204);
    expect((await stored.get()).data()).toMatchObject({ captainStatus: "confirmed", captainBy: people.supervisor, captainByRole: "captain", present: false });
    expect((await api("PATCH", `${path}/${encodeURIComponent(signedUp)}`, { present: true }, as)).status).toBe(204);

    // Their addition before the start is the captain's (pre-confirmed), not a walk-in.
    const teammate = await playerNotOn(game.id, collegeId, [signedUp]);
    expect((await api("PUT", `${path}/${encodeURIComponent(teammate)}`, undefined, as)).status).toBe(204);
    const added = db.doc(`seasons/${current}/matches/${game.id}/roster/${teammate}`);
    expect((await added.get()).data()).toMatchObject({ addedBy: "captain", captainStatus: "confirmed", captainByRole: "captain", present: false });

    // From the start: a supervisor only (no pre-confirming), attendance still.
    await game.ref.update({ startsAt: new Date(Date.now() - 60_000) });
    expect((await api("GET", `${path}/sheet`, undefined, as)).body.captainOf).toEqual([collegeId]);
    expect((await api("PATCH", `${path}/${encodeURIComponent(teammate)}`, { captainStatus: null }, as)).status).toBe(409);
    expect((await api("PATCH", `${path}/${encodeURIComponent(teammate)}`, { present: true }, as)).status).toBe(204);

    await game.ref.update({ startsAt: (game.data() as MatchDoc).startsAt });
    await Promise.all([stored.delete(), added.delete(), team.update({ captainIds: FieldValue.arrayRemove(people.supervisor) })]);
  });
});

describe("the captain's side", () => {
  it("confirms, removes and takes back the call on their own side until the start; not attendance", async () => {
    const { captain, collegeId, game, path } = await captainWithGame();
    const signedUp = await playerNotOn(game.id, collegeId);
    expect((await api("PUT", `/api/seasons/${current}/matches/${game.id}/roster/me`, undefined, { session: sessionFor(signedUp) })).status).toBe(204);
    const entry = `${path}/${encodeURIComponent(signedUp)}`;
    const as = { session: sessionFor(captain) };

    expect((await api("PATCH", entry, { captainStatus: "confirmed" }, as)).status).toBe(204);
    expect((await db.doc(`seasons/${current}/matches/${game.id}/roster/${signedUp}`).get()).data()).toMatchObject({ captainStatus: "confirmed", captainBy: captain });
    expect((await api("PATCH", entry, { captainStatus: "removed" }, as)).status).toBe(204);
    // Removed: the player can't sign up again or withdraw.
    expect((await api("PUT", `/api/seasons/${current}/matches/${game.id}/roster/me`, undefined, { session: sessionFor(signedUp) })).status).toBe(403);
    expect((await api("PATCH", entry, { captainStatus: null }, as)).status).toBe(204);
    expect((await api("PATCH", entry, { present: true }, as))).toMatchObject({ status: 403, body: { error: { message: "Only a supervisor confirms who came." } } });
    expect((await api("PATCH", entry, {}, as)).status).toBe(400);
  });

  it("adds their college's players (confirmed), not the other side's or nobody", async () => {
    const { captain, collegeId, other, game, path } = await captainWithGame();
    const as = { session: sessionFor(captain) };
    const teammate = await playerNotOn(game.id, collegeId);
    expect((await api("PUT", `${path}/${encodeURIComponent(teammate)}`, undefined, as)).status).toBe(204);
    expect((await db.doc(`seasons/${current}/matches/${game.id}/roster/${teammate}`).get()).data()).toMatchObject({
      collegeId,
      addedBy: "captain",
      addedByUser: captain,
      captainStatus: "confirmed",
      present: false,
    });
    const opponent = await playerNotOn(game.id, other);
    expect((await api("PUT", `${path}/${encodeURIComponent(opponent)}`, undefined, as)).status).toBe(403);
    expect((await api("PUT", `${path}/nobody%40example.edu`, undefined, as)).status).toBe(404);
  });

  it("can't change the other side, or a game that has started", async () => {
    const { captain, other, game, path } = await captainWithGame();
    const opponent = await playerNotOn(game.id, other);
    expect((await api("PUT", `/api/seasons/${current}/matches/${game.id}/roster/me`, undefined, { session: sessionFor(opponent) })).status).toBe(204);
    expect((await api("PATCH", `${path}/${encodeURIComponent(opponent)}`, { captainStatus: "removed" }, { session: sessionFor(captain) })).status).toBe(403);

    // A started game of the captain's team: only a supervisor changes it.
    const team = (await db.collectionGroup("teams").where("captainIds", "array-contains", captain).get()).docs[0].data() as TeamDoc;
    const past = (await db.collection(`seasons/${current}/matches`).where("collegeIds", "array-contains", team.collegeId).where("startsAt", "<", new Date()).get()).docs
      .find((g) => (g.data() as MatchDoc).sportId === team.sportId)!;
    const teammate = await playerNotOn(past.id, team.collegeId);
    const pastPath = `/api/seasons/${current}/matches/${past.id}/roster/${encodeURIComponent(teammate)}`;
    expect((await api("PUT", pastPath, undefined, { session: sessionFor(captain) })).status).toBe(409);
    expect((await api("PUT", pastPath, undefined, { session: supervisor() })).status).toBe(204);
  });
});

describe("the supervisor's attendance", () => {
  it("marks anyone present at any time, adds walk-ins, and logs changes after the game's day", async () => {
    const past = (await db.collection(`seasons/${current}/matches`).where("stage", "==", "regular").where("startsAt", "<", new Date(Date.now() - 2 * 86400_000)).orderBy("startsAt", "desc").limit(1).get()).docs[0];
    const m = past.data() as MatchDoc;
    const path = `/api/seasons/${current}/matches/${past.id}/roster`;
    const walkIn = await playerNotOn(past.id, m.collegeIds[0]);

    const logsBefore = (await db.collection(`seasons/${current}/auditLog`).where("action", "in", ["addRosterPlayer", "changeRosterEntry"]).get()).size;
    expect((await api("PUT", `${path}/${encodeURIComponent(walkIn)}`, undefined, { session: supervisor() })).status).toBe(204);
    expect((await db.doc(`seasons/${current}/matches/${past.id}/roster/${walkIn}`).get()).data()).toMatchObject({ addedBy: "supervisor", present: true, presentBy: people.supervisor });
    expect((await api("PATCH", `${path}/${encodeURIComponent(walkIn)}`, { present: false }, { session: supervisor() })).status).toBe(204);
    const logsAfter = (await db.collection(`seasons/${current}/auditLog`).where("action", "in", ["addRosterPlayer", "changeRosterEntry"]).get()).size;
    expect(logsAfter - logsBefore).toBe(2);
  });
});

describe("adding by NetID (U10; a fake Yale directory: tests/integration/fakeYalies.ts)", () => {
  /** An upcoming regular game of Benjamin Franklin (the fake directory's zz901 and zz903). */
  async function bfGame() {
    const games = await db.collection(`seasons/${current}/matches`).where("collegeIds", "array-contains", "BF").where("startsAt", ">", new Date()).orderBy("startsAt").get();
    const game = games.docs.find((g) => (g.data() as MatchDoc).stage === "regular" && (g.data() as MatchDoc).collegeIds.length === 2)!;
    return { game, path: `/api/seasons/${current}/matches/${game.id}/roster` };
  }

  it("looks a NetID up: the directory's person, not found, or unavailable (captains and supervisors)", async () => {
    expect(await api("GET", "/api/directory/zz901", undefined, { session: supervisor() })).toMatchObject({ status: 200, body: { status: "found", name: "Zoe Zane", collegeId: "BF" } });
    expect((await api("GET", "/api/directory/ZZ950", undefined, { session: supervisor() })).body).toEqual({ status: "not-found", netid: "zz950" });
    expect((await api("GET", "/api/directory/zz999", undefined, { session: supervisor() })).body.status).toBe("unavailable");
    expect((await api("GET", "/api/directory/zz901", undefined, { session: sessionFor(people.student(0, 1)) })).status).toBe(200); // a captain
    expect((await api("GET", "/api/directory/zz901", undefined, { session: sessionFor(player(0, 6)) })).status).toBe(403);
    expect((await api("GET", "/api/directory/a%20b", undefined, { session: supervisor() })).status).toBe(400);
  });

  it("adds the directory's person: an unclaimed account with their NetID, the season, the roster", async () => {
    const { game, path } = await bfGame();
    const r = await api("POST", `${path}/netid`, { netid: "zz901", collegeId: "BF" }, { session: supervisor() });
    // No account had the NetID, so it gets users/netid-zz901: the id it will have at their first login.
    const id = "netid-zz901";
    expect(r).toMatchObject({ status: 201, body: { playerId: id, verified: true } });
    expect((await db.doc(`users/${id}`).get()).data()).toMatchObject({
      netid: "zz901", email: "zoe.zane@yale.edu", name: "Zoe Zane", nameSource: "yalies", claimedAt: null, createdBy: people.supervisor,
    });
    expect((await db.doc(`seasons/${current}/players/${id}`).get()).data()).toMatchObject({ collegeId: "BF", name: "Zoe Zane", userId: id, joinedVia: "supervisor" });
    expect((await db.doc(`seasons/${current}/matches/${game.id}/roster/${id}`).get()).data()).toMatchObject({ collegeId: "BF", present: true });
    const logs = (await db.collection(`seasons/${current}/auditLog`).where("action", "==", "createAccountFor").get()).docs.map((d) => d.data().params);
    expect(logs).toContainEqual({ userId: id, netid: "zz901" });
    // Their account carries the NetID, so the sheet shows it, not "unverified".
    const sheet = await api("GET", `${path}/sheet`, undefined, { session: supervisor() });
    expect(sheet.body.items.find((e: { playerId: string }) => e.playerId === id).netid).toBe("zz901");
  });

  it("refuses the directory's person of another college", async () => {
    const { path } = await bfGame();
    const r = await api("POST", `${path}/netid`, { netid: "zz902", collegeId: "BF" }, { session: supervisor() });
    expect(r).toMatchObject({ status: 409 });
    expect(r.body.error.message).toContain("Morse");
  });

  it("adds a NetID the directory doesn't know (or can't answer for) unverified and unassigned; the person's visit claims it", async () => {
    const { game, path } = await bfGame();
    const captain = people.student(0, 1); // a BF captain (of the game's sport or not: a supervisor adds here)
    const r = await api("POST", `${path}/netid`, { netid: "ZZ950", collegeId: "BF", name: "New Kid" }, { session: supervisor() });
    expect(r).toMatchObject({ status: 201, body: { playerId: "netid-zz950", verified: false } });
    // An unclaimed account; the side doesn't give them a college (account plan, 3a).
    expect((await db.doc(`seasons/${current}/players/netid-zz950`).get()).data()).toMatchObject({ collegeId: null, name: "New Kid", userId: "netid-zz950" });
    expect((await db.doc("users/netid-zz950").get()).data()).toMatchObject({
      netid: "zz950", name: "New Kid", nameSource: "staff", claimedAt: null, createdBy: people.supervisor,
    });
    const down = await api("POST", `${path}/netid`, { netid: "zz999", collegeId: "BF" }, { session: supervisor() });
    expect(down).toMatchObject({ status: 201, body: { playerId: "netid-zz999", verified: false } });
    expect(captain).toBeTruthy();

    // The person behind zz950 opens the site signed in: the entry becomes theirs.
    const email = "new.kid@yale.edu";
    await api("GET", "/api/auth/session", undefined, { session: sessionFor(email, [], { netid: "zz950", name: "New Kid", college: "Benjamin Franklin" }) });
    expect((await db.doc(`seasons/${current}/players/netid-zz950`).get()).exists).toBe(false);
    expect((await db.doc(`seasons/${current}/matches/${game.id}/roster/netid-zz950`).get()).exists).toBe(false);
    expect((await db.doc(`seasons/${current}/matches/${game.id}/roster/${email}`).get()).data()).toMatchObject({ playerId: email, collegeId: "BF", present: true });
    const claims = (await db.collection(`seasons/${current}/auditLog`).where("action", "==", "claimPlaceholder").get()).docs.map((d) => d.data().params);
    expect(claims).toContainEqual({ netid: "zz950", userId: email });
    expect((await db.doc("users/netid-zz950").get()).exists).toBe(false);
  });

  it("finds an account by its stored NetID when the directory doesn't know it", async () => {
    const { game, path } = await bfGame();
    // A BF student with the seed's NetID (not in the fake directory) who isn't on the game.
    const onGame = new Set((await db.collection(`seasons/${current}/matches/${game.id}/roster`).get()).docs.map((d) => d.id));
    const bf = (await db.collection(`seasons/${current}/players`).where("collegeId", "==", "BF").get()).docs.map((d) => d.id).filter((id) => !onGame.has(id));
    const users = await Promise.all(bf.map(async (id) => ({ id, netid: (await db.doc(`users/${id}`).get()).data()?.netid as string | null })));
    const { id: student, netid } = users.find((u) => u.netid)!;
    const r = await api("POST", `${path}/netid`, { netid, collegeId: "BF" }, { session: supervisor() });
    expect(r).toMatchObject({ status: 201, body: { playerId: student, verified: true } });
  });

  it("is for the side's captain (until the start) and supervisors", async () => {
    const { path } = await bfGame();
    expect((await api("POST", `${path}/netid`, { netid: "zz903", collegeId: "BF" }, { session: sessionFor(player(0, 6)) })).status).toBe(403);
    expect((await api("POST", `${path}/netid`, { netid: "zz903", collegeId: "XX" }, { session: supervisor() })).status).toBe(400);
  });
});

describe("cancelling and deleting games", () => {
  async function newGame(): Promise<string> {
    const sport = (await db.collection(`seasons/${current}/sports`).limit(1).get()).docs[0].id;
    const startsAt = new Date(Date.now() + 30 * 86400_000).toISOString();
    const r = await api("POST", `/api/seasons/${current}/matches`, { sportId: sport, matches: [{ startsAt, homeCollegeId: "BF", awayCollegeId: "BK", venue: "Test", venueDetail: null }] }, { session: supervisor() });
    expect(r.status).toBe(201);
    return r.body.matchIds[0];
  }

  it("cancels a game (no sign-ups) and restores it", async () => {
    const id = await newGame();
    const path = `/api/seasons/${current}/matches/${id}`;
    expect((await api("PATCH", path, { status: "cancelled" }, { session: sessionFor(player(0, 6)) })).status).toBe(403);
    expect((await api("PATCH", path, { status: "cancelled" }, { session: supervisor() })).status).toBe(204);
    expect((await db.doc(`seasons/${current}/matches/${id}`).get()).data()!.status).toBe("cancelled");
    expect((await api("PUT", `${path}/roster/me`, undefined, { session: sessionFor(player(0, 6)) })).status).toBe(409);
    expect((await api("PATCH", path, { status: "scheduled" }, { session: supervisor() })).status).toBe(204);
    expect((await api("PUT", `${path}/roster/me`, undefined, { session: sessionFor(player(0, 6)) })).status).toBe(204);
  });

  it("keeps a cancelled game's roster unchanged and its attendance uncounted, and shows nobody (C19)", async () => {
    const id = await newGame();
    const path = `/api/seasons/${current}/matches/${id}`;
    const signedUp = player(0, 6);
    const entry = `${path}/roster/${encodeURIComponent(signedUp)}`;
    const mine = async () => (await api("GET", `/api/me/matches?seasonId=${current}`, undefined, { session: sessionFor(signedUp) })).body.items.find((m: { id: string }) => m.id === id).mine;
    expect((await api("PUT", `${path}/roster/me`, undefined, { session: sessionFor(signedUp) })).status).toBe(204);
    expect((await api("PATCH", entry, { present: true }, { session: supervisor() })).status).toBe(204);
    expect((await mine()).present).toBe(true);

    expect((await api("PATCH", path, { status: "cancelled" }, { session: supervisor() })).status).toBe(204);
    expect(await api("PATCH", entry, { present: false }, { session: supervisor() })).toMatchObject({ status: 409, body: { error: { message: "This game is cancelled." } } });
    expect((await mine()).present).toBe(false);
    expect((await api("GET", `${path}/roster`, undefined, { session: sessionFor(signedUp) })).body).toMatchObject({ items: [], total: 0 });
    expect((await db.doc(`seasons/${current}/matches/${id}/roster/${signedUp}`).get()).data()).toMatchObject({ present: true });

    // Restored: the attendance counts again.
    expect((await api("PATCH", path, { status: "scheduled" }, { session: supervisor() })).status).toBe(204);
    expect((await mine()).present).toBe(true);
    expect((await api("DELETE", path, undefined, { session: supervisor() })).status).toBe(204);
  });

  it("deletes an unscored game with its roster; not a scored game or a bracket's", async () => {
    const id = await newGame();
    const path = `/api/seasons/${current}/matches/${id}`;
    expect((await api("PUT", `${path}/roster/me`, undefined, { session: sessionFor(player(0, 6)) })).status).toBe(204);
    expect((await api("DELETE", path, undefined, { session: sessionFor(player(0, 6)) })).status).toBe(403);
    expect((await api("DELETE", path, undefined, { session: supervisor() })).status).toBe(204);
    expect((await db.doc(`seasons/${current}/matches/${id}`).get()).exists).toBe(false);
    expect((await db.collection(`seasons/${current}/matches/${id}/roster`).get()).size).toBe(0);
    const log = (await db.collection(`seasons/${current}/auditLog`).where("action", "==", "deleteMatch").get()).docs.map((d) => d.data());
    expect(log.some((l) => l.params.matchId === id && Object.keys(l.before).length === 2)).toBe(true);
    expect((await api("DELETE", path, undefined, { session: supervisor() })).status).toBe(404);

    const scored = (await db.collection(`seasons/${current}/matches`).where("status", "==", "final").where("stage", "==", "regular").limit(1).get()).docs[0];
    expect((await api("DELETE", `/api/seasons/${current}/matches/${scored.id}`, undefined, { session: supervisor() })).status).toBe(409);
    const inBracket = (await db.collection(`seasons/${current}/matches`).where("stage", "==", "playoff").where("status", "==", "scheduled").limit(1).get()).docs[0];
    expect((await api("DELETE", `/api/seasons/${current}/matches/${inBracket.id}`, undefined, { session: supervisor() })).status).toBe(409);
  });
});

describe("GET /api/auth/session: what the viewer may do", () => {
  it("says it per role", async () => {
    const can = async (email: string) => (await api("GET", "/api/auth/session", undefined, { session: sessionFor(email) })).body.viewer.can;
    expect(await can(people.supervisor)).toEqual({ editSchedule: true, score: true, takeAttendance: true, setChampion: false, manageRoles: false, managePeople: false });
    expect(await can(people.admin)).toEqual({ editSchedule: true, score: true, takeAttendance: true, setChampion: true, manageRoles: true, managePeople: true });
    expect(await can(player(0, 6))).toEqual({ editSchedule: false, score: false, takeAttendance: false, setChampion: false, manageRoles: false, managePeople: false });
  });
});

describe("reads for the game-day screens", () => {
  it("GET …/matches/{m}: one game, public", async () => {
    const game = (await db.collection(`seasons/${current}/matches`).limit(1).get()).docs[0];
    const r = await api("GET", `/api/seasons/${current}/matches/${game.id}`);
    expect(r).toMatchObject({ status: 200, body: { id: game.id, seasonId: current } });
    expect(r.body).not.toHaveProperty("scoredBy");
    expect((await api("GET", `/api/seasons/${current}/matches/nope`)).status).toBe(404);
  });

  it("GET /api/me/matches: each game with the caller's captain call and attendance", async () => {
    const { captain, collegeId, game } = await captainWithGame();
    const me = await playerNotOn(game.id, collegeId);
    expect((await api("PUT", `/api/seasons/${current}/matches/${game.id}/roster/me`, undefined, { session: sessionFor(me) })).status).toBe(204);
    await api("PATCH", `/api/seasons/${current}/matches/${game.id}/roster/${encodeURIComponent(me)}`, { captainStatus: "confirmed" }, { session: sessionFor(captain) });
    const r = await api("GET", `/api/me/matches?seasonId=${current}&upcoming=true`, undefined, { session: sessionFor(me) });
    expect(r.body.items.find((m: { id: string }) => m.id === game.id)).toMatchObject({ mine: { captainStatus: "confirmed", present: false } });
  });

  it("GET /api/users?role=supervisor: this season's supervisors (admins)", async () => {
    const r = await api("GET", "/api/users?role=supervisor", undefined, { session: sessionFor(people.admin) });
    expect(r.body.items.map((u: { id: string }) => u.id)).toEqual([people.supervisor]);
    expect((await api("GET", "/api/users?role=supervisor", undefined, { session: supervisor() })).status).toBe(403);
  });
});

describe("NetIDs (to tell same-named players apart)", () => {
  it("come with the sheet's entries and the college's player list", async () => {
    const { captain, collegeId, game, path } = await captainWithGame();
    const sheet = await api("GET", `${path}/sheet`, undefined, { session: sessionFor(captain) });
    for (const e of sheet.body.items) {
      const user = (await db.doc(`users/${e.playerId}`).get()).data();
      expect(e.netid).toBe(user?.netid ?? null);
    }
    expect(sheet.body.items.some((e: { netid: string | null }) => e.netid)).toBe(true);
    const list = await api("GET", `/api/seasons/${current}/colleges/${collegeId}/players`, undefined, { session: sessionFor(captain) });
    expect(list.body.items.every((p: { netid: unknown }) => p.netid === null || typeof p.netid === "string")).toBe(true);
    expect(list.body.items.filter((p: { netid: string | null }) => p.netid).length).toBeGreaterThan(0);
    expect(game.id).toBeTruthy();
  });

  it("are recorded on a visit for a user who has none yet, never overwritten", async () => {
    await db.doc(`users/${people.supervisor}`).update({ netid: null });
    await api("GET", "/api/auth/session", undefined, { session: sessionFor(people.supervisor) });
    expect((await db.doc(`users/${people.supervisor}`).get()).data()!.netid).toBe("supervisor");
    const student = people.student(3, 5);
    const before = (await db.doc(`users/${student}`).get()).data()!.netid;
    expect(before).toBeTruthy();
    await api("GET", "/api/auth/session", undefined, { session: sessionFor(student) });
    expect((await db.doc(`users/${student}`).get()).data()!.netid).toBe(before);
  });
});
