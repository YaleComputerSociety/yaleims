// The Firestore security rules (database/firestore.rules), on the emulator
// with a project of their own: deny by default; the browser may read only a
// season doc and its standings (the live listeners), and write nothing.
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, setLogLevel, writeBatch } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let env: RulesTestEnvironment;
beforeAll(async () => {
  setLogLevel("silent"); // the SDK logs every refused call; the asserts check them
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  env = await initializeTestEnvironment({
    projectId: "demo-yims-rules",
    firestore: { rules: readFileSync(new URL("../../../database/firestore.rules", import.meta.url), "utf8"), host, port: Number(port) },
  });
});
afterAll(() => env.cleanup());

const visitor = () => env.unauthenticatedContext().firestore();

describe("reads", () => {
  it("allows a season doc and its standings (the live listeners' queries)", async () => {
    await assertSucceeds(getDoc(doc(visitor(), "seasons/2026-2027")));
    await assertSucceeds(getDoc(doc(visitor(), "seasons/2026-2027/colleges/MC")));
    await assertSucceeds(getDocs(query(collection(visitor(), "seasons/2026-2027/colleges"), orderBy("rank", "asc"))));
  });

  it("delivers initial and live championship/ordered standings snapshots to a visitor", async () => {
    const season = "seasons/listener-regression";
    const update = async (celebrationActive: boolean, mcRank: number) => {
      await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const batch = writeBatch(db);
        batch.set(doc(db, season), { championCollegeId: "MC", celebrationActive });
        batch.set(doc(db, `${season}/colleges/MC`), { rank: mcRank });
        batch.set(doc(db, `${season}/colleges/BF`), { rank: 2 });
        await batch.commit();
      });
    };
    await update(false, 3);
    const db = visitor();
    let championship: unknown;
    let standings: string[] = [];
    const errors: Error[] = [];
    const stopChampionship = onSnapshot(doc(db, season), (snap) => {
      championship = snap.data();
    }, (error) => { errors.push(error); });
    const stopStandings = onSnapshot(
      query(collection(db, `${season}/colleges`), orderBy("rank", "asc")),
      (snap) => { standings = snap.docs.map((college) => college.id); },
      (error) => { errors.push(error); },
    );
    try {
      await vi.waitFor(() => {
        expect(errors).toEqual([]);
        expect(championship).toEqual({ championCollegeId: "MC", celebrationActive: false });
        expect(standings).toEqual(["BF", "MC"]);
      }, { timeout: 5_000 });
      await update(true, 1);
      await vi.waitFor(() => {
        expect(errors).toEqual([]);
        expect(championship).toEqual({ championCollegeId: "MC", celebrationActive: true });
        expect(standings).toEqual(["MC", "BF"]);
      }, { timeout: 5_000 });
    } finally {
      stopChampionship();
      stopStandings();
    }
  });

  it.each([
    "seasons/2026-2027/colleges/MC/teams/soccer",
    "seasons/2026-2027/colleges/MC/mvps/a1",
    "seasons/2026-2027/sports/soccer",
    "seasons/2026-2027/players/a@yale.edu",
    "seasons/2026-2027/matches/abc",
    "seasons/2026-2027/matches/abc/roster/a@yale.edu",
    "seasons/2026-2027/matches/abc/scoreReports/r1",
    "seasons/2026-2027/brackets/b1",
    "seasons/2026-2027/auditLog/e1",
    "users/a@yale.edu",
    "usernames/bulldog1",
    "config/app",
    "counters/usernames",
    "loginAttempts/state-hash",
    // pre-v3 collections and leftovers
    "matches/seasons/2025-2026/1",
    "colleges/MC",
    "user_api_keys/k1",
    "users/a@yale.edu/api_keys/k1",
  ])("denies %s", async (path) => {
    await assertFails(getDoc(doc(visitor(), path)));
  });

  it("denies listing users and matches", async () => {
    await assertFails(getDocs(collection(visitor(), "users")));
    await assertFails(getDocs(collection(visitor(), "loginAttempts")));
    await assertFails(getDocs(collection(visitor(), "seasons/2026-2027/matches")));
    await assertFails(getDocs(collection(visitor(), "seasons/2026-2027/auditLog")));
  });
});

describe("writes", () => {
  it("denies every write from the browser, also where reads are allowed", async () => {
    await assertFails(setDoc(doc(visitor(), "seasons/2026-2027"), { celebrationActive: true }));
    await assertFails(setDoc(doc(visitor(), "seasons/2026-2027/colleges/MC"), { points: 1000 }));
    await assertFails(setDoc(doc(visitor(), "users/a@yale.edu"), { roles: ["admin"] }));
    await assertFails(setDoc(doc(visitor(), "loginAttempts/state-hash"), { browserHash: "forged" }));
    await assertFails(setDoc(doc(visitor(), "seasons/2026-2027/auditLog/e1"), { action: "forged" }));
  });
});
