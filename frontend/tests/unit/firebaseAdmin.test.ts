// Configuring an already-used Firestore client throws. A development reload
// must keep the configured client usable after its first request.
import { afterEach, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => {
  const apps: object[] = [];
  let used = false;
  const client = {
    settings: () => { if (used) throw new Error("Client already initialized"); },
    doc: () => ({ get: async () => { used = true; return { exists: true }; } }),
  };
  return { apps, client };
});

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/app", () => ({
  getApps: () => sdk.apps,
  initializeApp: () => { const app = {}; sdk.apps.push(app); return app; },
}));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => sdk.client }));

afterEach(() => { vi.unstubAllGlobals(); });

it("keeps a configured client usable across a module reload after a request", async () => {
  vi.stubGlobal("yimsAdminDb", undefined);
  const first = await import("@/server/firebaseAdmin");
  expect((await first.adminDb.doc("test/first").get()).exists).toBe(true);
  vi.resetModules();
  const reloaded = await import("@/server/firebaseAdmin");
  expect(reloaded.adminDb).toBe(first.adminDb);
  expect((await reloaded.adminDb.doc("test/second").get()).exists).toBe(true);
});
