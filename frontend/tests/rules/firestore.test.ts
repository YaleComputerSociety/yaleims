// The Firestore security rules (database/firestore.rules), on the emulator
// with a project of their own. Today: reads public except API keys and the
// audit log; no writes from the browser. Phase 2D step 7 narrows the reads.
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, setLogLevel } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

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
  it("allows the league's data", async () => {
    await assertSucceeds(getDoc(doc(visitor(), "seasons/2026-2027/colleges/MC")));
    await assertSucceeds(getDoc(doc(visitor(), "seasons/2026-2027/matches/abc")));
    await assertSucceeds(getDoc(doc(visitor(), "config/app")));
  });
  it("denies the audit log and API keys", async () => {
    await assertFails(getDoc(doc(visitor(), "seasons/2026-2027/auditLog/e1")));
    await assertFails(getDoc(doc(visitor(), "user_api_keys/k1")));
    await assertFails(getDoc(doc(visitor(), "users/a@yale.edu/api_keys/k1")));
  });
});

describe("writes", () => {
  it("denies every write from the browser", async () => {
    await assertFails(setDoc(doc(visitor(), "seasons/2026-2027/colleges/MC"), { points: 1000 }));
    await assertFails(setDoc(doc(visitor(), "users/a@yale.edu"), { roles: ["admin"] }));
  });
});
