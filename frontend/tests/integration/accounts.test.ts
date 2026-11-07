// Accounts by NetID (account plan, Execution brief "Identity" and
// "Directory"): which account a NetID resolves to, the "netid-<netid>" id of
// new accounts, what each directory answer fills in, the lookup cooldown,
// names, and sessions of both cookie formats. The services run in-process
// against the emulator and the fake directory (fakeYalies.ts: "zzbf…" is a
// whole Benjamin Franklin record, "zznomail…" one without an email, other
// "zz…" NetIDs aren't listed, "zz99…" can't be reached).
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { paths } from "@/lib/paths";
import { api, db, people, seasons, sessionFor, sessionOf } from "./helpers";

const { signIn, ensureAccount } = await import("@/server/services/accounts");

let current: string;
beforeAll(async () => { ({ current } = await seasons()); });

// Every doc a test may create or change, restored after it (with the usernames of new accounts).
const saved = new Map<string, DocumentData | undefined>();
afterEach(async () => {
  for (const [path, before] of saved) {
    const after = (await db.doc(path).get()).data();
    if (path.startsWith("users/") && !before && after?.username) await db.doc(paths.username(after.username)).delete();
    if (before) await db.doc(path).set(before);
    else await db.doc(path).delete();
  }
  saved.clear();
});

let sequence = 0;
/** A made-up person (the NetID's prefix picks their directory record): NetID, Yale email, a new account's id; their docs are restored after the test. */
async function person(prefix = "zzbf") {
  const netid = `${prefix}${++sequence}`;
  const email = `${netid}@yale.edu`;
  const id = `netid-${netid}`;
  for (const path of [paths.user(email), paths.user(id), paths.player(current, email), paths.player(current, id)]) {
    if (!saved.has(path)) saved.set(path, (await db.doc(path).get()).data());
  }
  return { netid, email, id };
}

/** An account as made before November 2026: keyed by email, the name as firstname/lastname. */
const olderAccount = (email: string, netid: string | null) =>
  db.doc(paths.user(email)).set({
    email, firstname: "Old", lastname: "Name", netid, username: `Old${email}`, roles: [],
    claimedAt: Timestamp.fromMillis(1000), createdBy: null,
  });

const user = async (id: string) => (await db.doc(paths.user(id)).get()).data();
const player = async (id: string) => (await db.doc(paths.player(current, id)).get()).data();
const accountsWithNetid = async (netid: string) => (await db.collection("users").where("netid", "==", netid).get()).size;
/** Lets the user's next directory lookup run now. */
const endCooldown = (id: string) => db.doc(paths.user(id)).update({ "directory.nextAt": Timestamp.fromMillis(Date.now() - 1000) });

describe("resolving a NetID to an account", () => {
  it("gives a NetID no account has users/netid-<netid>: claimed, with the directory's name and email, its username and season", async () => {
    const p = await person();
    expect(await signIn(p.netid, current)).toBe(p.id);
    const doc = (await user(p.id))!;
    expect(doc).toEqual({
      email: p.email, name: "Ann Lee", nameSource: "yalies", netid: p.netid, username: expect.any(String),
      roles: [], claimedAt: expect.any(Timestamp), createdBy: null,
      directory: { outcome: "found", checkedAt: expect.any(Timestamp), nextAt: expect.any(Timestamp) },
    });
    expect((await db.doc(paths.username(doc.username)).get()).data()).toEqual({ userId: p.id });
    expect(await player(p.id)).toMatchObject({
      collegeId: "BF", userId: p.id, joinedVia: "login", collegeHistory: [{ collegeId: "BF", source: "yalies", since: expect.any(Timestamp) }],
    });
    expect(await user(p.email)).toBeUndefined();
  });

  it("keeps an older account: the one with the NetID recorded, else the one of the email the directory gives", async () => {
    const recorded = await person();
    const older = `old.${recorded.email}`;
    saved.set(paths.user(older), undefined);
    saved.set(paths.player(current, older), undefined);
    await olderAccount(older, recorded.netid);
    // The directory gives another address; the recorded NetID decides.
    expect(await signIn(recorded.netid, current)).toBe(older);
    expect(await user(older)).toMatchObject({ email: older, name: "Ann Lee", nameSource: "yalies" });

    const unrecorded = await person();
    await olderAccount(unrecorded.email, null);
    expect(await signIn(unrecorded.netid, current)).toBe(unrecorded.email);
    expect(await user(unrecorded.email)).toMatchObject({ netid: unrecorded.netid });
    for (const p of [recorded, unrecorded]) expect(await user(p.id)).toBeUndefined();
  });

  it("refuses two older accounts with one NetID, and an older account recorded with another NetID, writing nothing", async () => {
    const twice = await person();
    const other = `other.${twice.email}`;
    saved.set(paths.user(other), undefined);
    await olderAccount(twice.email, twice.netid);
    await olderAccount(other, twice.netid);
    await expect(signIn(twice.netid, current)).rejects.toMatchObject({ status: 409 });

    const mismatch = await person();
    await olderAccount(mismatch.email, "zzsomeoneelse");
    await expect(signIn(mismatch.netid, current)).rejects.toMatchObject({ status: 409 });
    for (const p of [twice, mismatch]) {
      expect(await user(p.id)).toBeUndefined();
      expect(await player(p.email)).toBeUndefined();
    }
  });

  it("makes one account for concurrent first logins", async () => {
    const p = await person();
    expect(await Promise.all([1, 2].map(() => signIn(p.netid, current)))).toEqual([p.id, p.id]);
    expect(await accountsWithNetid(p.netid)).toBe(1);
  });

  it("lets a login claim the account a supervisor made, under the same id, with the placeholder player", async () => {
    const p = await person();
    // Added while the directory was down (a placeholder player), then again once it answered (an unclaimed account).
    await db.doc(paths.player(current, p.id)).set({
      seasonId: current, collegeId: "BF", name: "Walk In", userId: null, roles: [], joinedAt: Timestamp.fromMillis(1000), joinedVia: "supervisor",
    });
    const actor = { userId: people.supervisor, roles: ["user", "supervisor"] };
    const found = { outcome: "found" as const, person: { netid: p.netid, name: "Ann Lee", email: p.email, college: "Benjamin Franklin College" } };
    expect(await ensureAccount(found, p.netid, actor, current)).toBe(p.id);
    expect(await user(p.id)).toMatchObject({ claimedAt: null, createdBy: people.supervisor });

    expect(await signIn(p.netid, current)).toBe(p.id);
    expect(await user(p.id)).toMatchObject({ claimedAt: expect.any(Timestamp), createdBy: people.supervisor });
    expect(await player(p.id)).toMatchObject({ userId: p.id, name: "Ann Lee", joinedVia: "supervisor" });
    expect(await accountsWithNetid(p.netid)).toBe(1);
  });

  it("never replaces a name an admin set", async () => {
    const p = await person();
    await db.doc(paths.user(p.id)).set({
      email: null, name: "Set By Admin", nameSource: "admin", netid: p.netid, username: `U${p.id}`, roles: [], claimedAt: null, createdBy: null,
    });
    await signIn(p.netid, current);
    expect(await user(p.id)).toMatchObject({ name: "Set By Admin", nameSource: "admin", email: p.email });
  });
});

describe("signing in with whatever the directory knows", () => {
  it("applies each field on its own: a record without an email still gives the name and college", async () => {
    const p = await person("zznomail");
    expect(await signIn(p.netid, current)).toBe(p.id);
    expect(await user(p.id)).toMatchObject({ email: null, name: "Nomail Person", nameSource: "yalies", directory: { outcome: "partial" } });
    expect(await player(p.id)).toMatchObject({ collegeId: "BF" });
  });

  it("signs in a NetID the directory doesn't list: no name, no email, unassigned this season", async () => {
    const p = await person("zzunlisted");
    expect(await signIn(p.netid, current)).toBe(p.id);
    expect(await user(p.id)).toMatchObject({ email: null, name: null, nameSource: "none", directory: { outcome: "not-found" } });
    expect(await player(p.id)).toMatchObject({ collegeId: null, collegeHistory: [], joinedVia: "login" });
  });

  it("signs in with the directory down, and joins the season once it answers", async () => {
    const p = await person("zz99down");
    expect(await signIn(p.netid, current)).toBe(p.id);
    expect(await user(p.id)).toMatchObject({ directory: { outcome: "unavailable" } });
    expect(await player(p.id)).toBeUndefined();
  });

  it("signs in without a current season", async () => {
    const p = await person();
    expect(await signIn(p.netid, null)).toBe(p.id);
    expect(await player(p.id)).toBeUndefined();
  });
});

describe("POST /api/me/directory (Check Yalies again)", () => {
  const checkAgain = (id: string, netid: string) => api("POST", "/api/me/directory", undefined, { session: sessionOf(id, netid) });

  it("is refused within the cooldown (429, Retry-After); once at a time, also from two tabs", async () => {
    const p = await person("zzunlisted");
    await signIn(p.netid, current);
    const early = await fetch(`${process.env.BASE}/api/me/directory`, {
      method: "POST", headers: { cookie: `token=${sessionOf(p.id, p.netid)}`, origin: process.env.BASE! },
    });
    expect(early.status).toBe(429);
    expect(Number(early.headers.get("retry-after"))).toBeGreaterThan(60);
    expect((await early.json()).error).toMatchObject({ code: "rate-limited", details: { retryAt: expect.any(String) } });

    await endCooldown(p.id);
    const both = await Promise.all([checkAgain(p.id, p.netid), checkAgain(p.id, p.netid)]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 429]);
    expect(both.find((r) => r.status === 200)!.body).toEqual({ outcome: "not-found" });
  });

  it("assigns the college to an unassigned player, but not over an admin's clearing", async () => {
    const p = await person();
    await signIn(p.netid, current);
    await db.doc(paths.player(current, p.id)).update({ collegeId: null, collegeHistory: [] });
    await endCooldown(p.id);
    expect((await checkAgain(p.id, p.netid)).body).toEqual({ outcome: "found" });
    expect(await player(p.id)).toMatchObject({ collegeId: "BF", collegeHistory: [{ collegeId: "BF", source: "yalies" }] });

    const cleared = [{ collegeId: null, source: "admin", since: Timestamp.now() }];
    await db.doc(paths.player(current, p.id)).update({ collegeId: null, collegeHistory: cleared });
    await endCooldown(p.id);
    await checkAgain(p.id, p.netid);
    expect(await player(p.id)).toMatchObject({ collegeId: null, collegeHistory: [{ collegeId: null, source: "admin" }] });
  });
});

describe("PATCH /api/me (name)", () => {
  const rename = (id: string, netid: string, name: unknown) => api("PATCH", "/api/me", { name }, { session: sessionOf(id, netid) });

  it("sets a name while the directory has given none, also on the season's player doc; never over the directory's", async () => {
    const p = await person("zzunlisted");
    await signIn(p.netid, current);
    expect((await rename(p.id, p.netid, "  ")).status).toBe(400);
    expect((await rename(p.id, p.netid, "<b>x</b>")).status).toBe(400);
    expect((await rename(p.id, p.netid, " Sam Typed ")).status).toBe(204);
    expect(await user(p.id)).toMatchObject({ name: "Sam Typed", nameSource: "self" });
    expect(await player(p.id)).toMatchObject({ name: "Sam Typed" });
    const session = await api("GET", "/api/auth/session", undefined, { session: sessionOf(p.id, p.netid) });
    expect(session.body.viewer).toMatchObject({ name: "Sam Typed", canEditName: true, directory: { outcome: "not-found" } });

    const listed = await person();
    await signIn(listed.netid, current);
    expect((await rename(listed.id, listed.netid, "Not Me")).status).toBe(403);
    expect(await user(listed.id)).toMatchObject({ name: "Ann Lee", nameSource: "yalies" });
  });
});

describe("sessions", () => {
  it("serve a new-format cookie from Firestore, with the account's email as the contact address", async () => {
    const p = await person();
    await signIn(p.netid, current);
    const session = await api("GET", "/api/auth/session", undefined, { session: sessionOf(p.id, p.netid) });
    expect(session.body.viewer).toMatchObject({ userId: p.id, email: p.email, name: "Ann Lee", collegeId: "BF", canEditName: false });

    // As BF's rep, their contact link is their email, not their id.
    await db.doc(paths.player(current, p.id)).update({ roles: ["college_rep"] });
    const leaders = await api("GET", `/api/seasons/${current}/colleges/BF/leaders`, undefined, { session: sessionFor(people.student(0, 6)) });
    expect(leaders.body.reps).toContainEqual({ playerId: p.id, name: "Ann Lee", email: p.email });
  });

  it("read an older account's name from firstname and lastname, through an old cookie", async () => {
    const p = await person("zzunlisted");
    await olderAccount(p.email, p.netid);
    const session = await api("GET", "/api/auth/session", undefined, { session: sessionFor(p.email, [], { netid: p.netid }) });
    expect(session.body.viewer).toMatchObject({ userId: p.email, email: p.email, name: "Old Name" });
  });
});
