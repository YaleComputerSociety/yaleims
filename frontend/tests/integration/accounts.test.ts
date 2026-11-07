// Accounts by NetID (account plan, Execution brief "Identity"): which account
// a NetID resolves to, the "netid-<netid>" id of new accounts, and sessions
// of both cookie formats. The services run in-process against the emulator.
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
/** A made-up person: their NetID, Yale email and the id a new account of theirs gets; their docs are restored after the test. */
async function person() {
  const netid = `zzacct${++sequence}`;
  const email = `${netid}@yale.edu`;
  const id = `netid-${netid}`;
  for (const path of [paths.user(email), paths.user(id), paths.player(current, email), paths.player(current, id)]) {
    if (!saved.has(path)) saved.set(path, (await db.doc(path).get()).data());
  }
  return { netid, email, id };
}

/** What Yalies says about them. */
const directory = (netid: string, email: string) =>
  ({ netid, email, first_name: "Ann", last_name: "Lee", college: "Benjamin Franklin College" });

/** An account as made before November 2026: keyed by email, the name as firstname/lastname. */
const olderAccount = (email: string, netid: string | null) =>
  db.doc(paths.user(email)).set({
    email, firstname: "Old", lastname: "Name", netid, username: `Old${email}`, roles: [],
    claimedAt: Timestamp.fromMillis(1000), createdBy: null,
  });

const user = async (id: string) => (await db.doc(paths.user(id)).get()).data();
const accountsWithNetid = async (netid: string) => (await db.collection("users").where("netid", "==", netid).get()).size;

describe("resolving a NetID to an account", () => {
  it("gives a NetID no account has users/netid-<netid>: claimed, with Yalies' name and email, its username and season", async () => {
    const p = await person();
    expect(await signIn(directory(p.netid, p.email), p.netid, current)).toBe(p.id);
    const doc = (await user(p.id))!;
    expect(doc).toEqual({
      email: p.email, name: "Ann Lee", nameSource: "yalies", netid: p.netid, username: expect.any(String),
      roles: [], claimedAt: expect.any(Timestamp), createdBy: null,
    });
    expect((await db.doc(paths.username(doc.username)).get()).data()).toEqual({ userId: p.id });
    expect((await db.doc(paths.player(current, p.id)).get()).data()).toMatchObject({ collegeId: "BF", userId: p.id, joinedVia: "login" });
    expect(await user(p.email)).toBeUndefined();
  });

  it("keeps an older account: the one with the NetID recorded, else the one of the email Yalies gives", async () => {
    const recorded = await person();
    await olderAccount(recorded.email, recorded.netid);
    // Yalies may give another address; the recorded NetID decides.
    expect(await signIn(directory(recorded.netid, `alias.${recorded.email}`), recorded.netid, current)).toBe(recorded.email);
    expect(await user(recorded.email)).toMatchObject({ email: recorded.email, name: "Ann Lee", nameSource: "yalies" });

    const unrecorded = await person();
    await olderAccount(unrecorded.email, null);
    expect(await signIn(directory(unrecorded.netid, unrecorded.email), unrecorded.netid, current)).toBe(unrecorded.email);
    expect(await user(unrecorded.email)).toMatchObject({ netid: unrecorded.netid });
    for (const p of [recorded, unrecorded]) expect(await user(p.id)).toBeUndefined();
  });

  it("refuses two accounts with one NetID, and an email account recorded with another NetID, writing nothing", async () => {
    const twice = await person();
    const other = `other.${twice.email}`;
    saved.set(paths.user(other), undefined);
    await olderAccount(twice.email, twice.netid);
    await olderAccount(other, twice.netid);
    await expect(signIn(directory(twice.netid, twice.email), twice.netid, current)).rejects.toMatchObject({ status: 409 });

    const mismatch = await person();
    await olderAccount(mismatch.email, "zzsomeoneelse");
    await expect(signIn(directory(mismatch.netid, mismatch.email), mismatch.netid, current)).rejects.toMatchObject({ status: 409 });
    for (const p of [twice, mismatch]) {
      expect(await user(p.id)).toBeUndefined();
      expect((await db.doc(paths.player(current, p.email)).get()).exists).toBe(false);
    }
  });

  it("makes one account for concurrent first logins", async () => {
    const p = await person();
    const ids = await Promise.all([1, 2].map(() => signIn(directory(p.netid, p.email), p.netid, current)));
    expect(ids).toEqual([p.id, p.id]);
    expect(await accountsWithNetid(p.netid)).toBe(1);
  });

  it("lets a login claim the account a supervisor made, under the same id, with the placeholder player", async () => {
    const p = await person();
    // Added while Yalies was down (a placeholder player), then again once it answered (an unclaimed account).
    await db.doc(paths.player(current, p.id)).set({
      seasonId: current, collegeId: "BF", name: "Walk In", userId: null, roles: [], joinedAt: Timestamp.fromMillis(1000), joinedVia: "supervisor",
    });
    const actor = { userId: people.supervisor, roles: ["user", "supervisor"] };
    expect(await ensureAccount(directory(p.netid, p.email), p.netid, actor, current)).toBe(p.id);
    expect(await user(p.id)).toMatchObject({ claimedAt: null, createdBy: people.supervisor });

    expect(await signIn(directory(p.netid, p.email), p.netid, current)).toBe(p.id);
    expect(await user(p.id)).toMatchObject({ claimedAt: expect.any(Timestamp), createdBy: people.supervisor });
    expect((await db.doc(paths.player(current, p.id)).get()).data()).toMatchObject({ userId: p.id, name: "Ann Lee", joinedVia: "supervisor" });
    expect(await accountsWithNetid(p.netid)).toBe(1);
  });

  it("never replaces a name an admin set", async () => {
    const p = await person();
    await db.doc(paths.user(p.id)).set({
      email: null, name: "Set By Admin", nameSource: "admin", netid: p.netid, username: `U${p.id}`, roles: [], claimedAt: null, createdBy: null,
    });
    await signIn(directory(p.netid, p.email), p.netid, current);
    expect(await user(p.id)).toMatchObject({ name: "Set By Admin", nameSource: "admin", email: p.email });
  });
});

describe("sessions", () => {
  it("serve a new-format cookie from Firestore, with the account's email as the contact address", async () => {
    const p = await person();
    await signIn(directory(p.netid, p.email), p.netid, current);
    const session = await api("GET", "/api/auth/session", undefined, { session: sessionOf(p.id, p.netid) });
    expect(session.body.viewer).toMatchObject({ userId: p.id, email: p.email, name: "Ann Lee", collegeId: "BF" });

    // As BF's rep, their contact link is their email, not their id.
    await db.doc(paths.player(current, p.id)).update({ roles: ["college_rep"] });
    const leaders = await api("GET", `/api/seasons/${current}/colleges/BF/leaders`, undefined, { session: sessionFor(people.student(0, 6)) });
    expect(leaders.body.reps).toContainEqual({ playerId: p.id, name: "Ann Lee", email: p.email });
  });

  it("read an older account's name from firstname and lastname, through an old cookie", async () => {
    const p = await person();
    await olderAccount(p.email, p.netid);
    const session = await api("GET", "/api/auth/session", undefined, { session: sessionFor(p.email, [], { netid: p.netid }) });
    expect(session.body.viewer).toMatchObject({ userId: p.email, email: p.email, name: "Old Name" });
  });
});
