// Reference writers must check the player in their transaction so stale
// requests cannot recreate a placeholder or award a deleted identity.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Timestamp, type DocumentData, type DocumentReference } from "firebase-admin/firestore";
import { paths } from "@/lib/paths";
import { placeholderId } from "@/lib/netid";
import { db, people, seasons } from "./helpers";

const { setMvp } = await import("@/server/services/mvps");
const { joinSeason } = await import("@/server/services/accounts");

let current: string;
let sequence = 0;
const saved = new Map<string, DocumentData | undefined>();
const awardRecipients: string[] = [];
beforeAll(async () => { ({ current } = await seasons()); });
afterEach(async () => {
  vi.restoreAllMocks();
  for (const playerId of awardRecipients.splice(0)) {
    const awards = await db.collection(paths.mvps(current, "BF")).where("playerId", "==", playerId).get();
    for (const award of awards.docs) await award.ref.delete();
  }
  for (const [path, data] of saved) {
    if (data) await db.doc(path).set(data);
    else await db.doc(path).delete();
  }
  saved.clear();
});

async function remember(ref: DocumentReference) {
  if (!saved.has(ref.path)) saved.set(ref.path, (await ref.get()).data());
  return ref;
}

async function identity() {
  const netid = `zzclaim${++sequence}`;
  const email = `${netid}@yale.edu`;
  const placeholder = placeholderId(netid);
  const source = await remember(db.doc(paths.player(current, placeholder)));
  await source.set({
    seasonId: current, collegeId: "BF", name: "Unverified Player", userId: null,
    roles: [], joinedAt: Timestamp.fromMillis(1000), joinedVia: "captain",
  });
  awardRecipients.push(placeholder);
  return { netid, email, placeholder, source };
}

/** Hold the next transaction before its first read, without timing-based sleeps. */
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

const nameMvp = (playerId: string) => setMvp(current, "BF", { week: 51, playerId, awardedBy: people.student(0, 0) });

describe("placeholder reference writers", () => {
  it.each(["deleted", "other-college"])("refuses a late MVP award when its player becomes %s before the transaction", async (change) => {
    const person = await identity();
    const gate = holdTransaction();
    const award = nameMvp(person.placeholder);
    try {
      await gate.reached;
      if (change === "deleted") await person.source.delete();
      else await person.source.update({ collegeId: "BK" });
    } finally { gate.release(); }
    expect(await award).toBe(false);
    expect((await db.collection(paths.mvps(current, "BF")).where("playerId", "==", person.placeholder).get()).empty).toBe(true);
  });

  it("uses the name from the player read inside the award transaction", async () => {
    const person = await identity();
    const gate = holdTransaction();
    const award = nameMvp(person.placeholder);
    try {
      await gate.reached;
      await person.source.update({ name: "Corrected Name" });
    } finally { gate.release(); }
    expect(await award).toBe(true);
    const awards = await db.collection(paths.mvps(current, "BF")).where("playerId", "==", person.placeholder).get();
    expect(awards.docs.map((doc) => doc.data())).toEqual([expect.objectContaining({
      name: "Corrected Name", awardedBy: people.student(0, 0), awardedAt: expect.any(Timestamp),
    })]);
  });

  it("does not recreate an unverified placeholder after its account is known", async () => {
    const person = await identity();
    const user = await remember(db.doc(paths.user(person.email)));
    await user.set({ netid: person.netid });
    await person.source.delete();
    await expect(joinSeason(current, person.placeholder, "Stale lookup", "BF", "captain"))
      .rejects.toMatchObject({ code: "conflict", status: 409 });
    expect((await person.source.get()).exists).toBe(false);
  });

  it("still creates and reuses a placeholder while its NetID is unverified", async () => {
    const person = await identity();
    await person.source.delete();
    expect(await joinSeason(current, person.placeholder, "Unknown Player", "BF", "captain"))
      .toEqual({ collegeId: "BF", roles: [] });
    const original = (await person.source.get()).data();
    await joinSeason(current, person.placeholder, "Other name", "BK", "supervisor");
    expect((await person.source.get()).data()).toEqual(original);
    expect(original).toMatchObject({ collegeId: "BF", name: "Unknown Player", userId: null, joinedVia: "captain" });
  });
});
