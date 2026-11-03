// The roster sheet (D34): captains prepare their side until the start,
// supervisors take attendance at any time; and cancelling and deleting games.
import { beforeAll, describe, expect, it } from "vitest";
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

/** A season player of `collegeId` who isn't on `matchId`'s roster. */
async function playerNotOn(matchId: string, collegeId: string): Promise<string> {
  const players = await db.collection(`seasons/${current}/players`).where("collegeId", "==", collegeId).get();
  for (const p of players.docs) {
    if (p.id.startsWith("guest-")) continue;
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
    expect(mine.body).toMatchObject({ collegeIds: [collegeId], supervisor: false });
    for (const e of mine.body.items) expect(e).toMatchObject({ collegeId, playerId: expect.any(String) });

    const all = await api("GET", `${path}/sheet`, undefined, { session: supervisor() });
    expect(all.body.supervisor).toBe(true);
    expect([...all.body.collegeIds].sort()).toEqual([collegeId, other].sort());
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
    expect((await api("PATCH", entry, { present: true }, as))).toMatchObject({ status: 403, body: { error: { message: "Only a supervisor takes attendance." } } });
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
  it("marks anyone present at any time, adds walk-ins and guests, and logs changes after the game's day", async () => {
    const past = (await db.collection(`seasons/${current}/matches`).where("stage", "==", "regular").where("startsAt", "<", new Date(Date.now() - 2 * 86400_000)).orderBy("startsAt", "desc").limit(1).get()).docs[0];
    const m = past.data() as MatchDoc;
    const path = `/api/seasons/${current}/matches/${past.id}/roster`;
    const walkIn = await playerNotOn(past.id, m.collegeIds[0]);

    const logsBefore = (await db.collection(`seasons/${current}/auditLog`).where("action", "in", ["addRosterPlayer", "changeRosterEntry", "addRosterGuest"]).get()).size;
    expect((await api("PUT", `${path}/${encodeURIComponent(walkIn)}`, undefined, { session: supervisor() })).status).toBe(204);
    expect((await db.doc(`seasons/${current}/matches/${past.id}/roster/${walkIn}`).get()).data()).toMatchObject({ addedBy: "supervisor", present: true, presentBy: people.supervisor });
    expect((await api("PATCH", `${path}/${encodeURIComponent(walkIn)}`, { present: false }, { session: supervisor() })).status).toBe(204);

    const guest = await api("POST", `${path}/guests`, { name: "Walk In", collegeId: m.collegeIds[1] }, { session: supervisor() });
    expect(guest.status).toBe(201);
    expect(guest.body.playerId).toMatch(/^guest-[0-9a-f]{12}$/);
    expect((await db.doc(`seasons/${current}/players/${guest.body.playerId}`).get()).data()).toMatchObject({ collegeId: m.collegeIds[1], name: "Walk In", userId: null, joinedVia: "supervisor" });
    expect((await db.doc(`seasons/${current}/matches/${past.id}/roster/${guest.body.playerId}`).get()).data()).toMatchObject({ present: true, name: "Walk In" });

    const logsAfter = (await db.collection(`seasons/${current}/auditLog`).where("action", "in", ["addRosterPlayer", "changeRosterEntry", "addRosterGuest"]).get()).size;
    expect(logsAfter - logsBefore).toBe(3);
  });

  it("refuses guests from anyone else and for a college not in the game", async () => {
    const { captain, game, path } = await captainWithGame();
    const notPlaying = ["BF", "BK", "BR", "DC"].find((c) => !(game.data() as MatchDoc).collegeIds.includes(c))!;
    expect((await api("POST", `${path}/guests`, { name: "X", collegeId: (game.data() as MatchDoc).collegeIds[0] }, { session: sessionFor(captain) })).status).toBe(403);
    expect((await api("POST", `${path}/guests`, { name: "X", collegeId: notPlaying }, { session: supervisor() })).status).toBe(409);
    expect((await api("POST", `${path}/guests`, { name: " ", collegeId: notPlaying }, { session: supervisor() })).status).toBe(400);
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
    expect(await can(people.supervisor)).toEqual({ editSchedule: true, score: true, takeAttendance: true, setChampion: false, manageRoles: false });
    expect(await can(people.admin)).toEqual({ editSchedule: true, score: true, takeAttendance: true, setChampion: true, manageRoles: true });
    expect(await can(player(0, 6))).toEqual({ editSchedule: false, score: false, takeAttendance: false, setChampion: false, manageRoles: false });
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
