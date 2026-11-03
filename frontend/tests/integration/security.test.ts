// The cross-site write guard (proxy.ts, D42): a write must come from our own
// pages (its Origin is the host it was sent to); reads need no Origin. Who may
// change captains and name MVPs is in the auth matrix, people and MVP tests;
// MVP week 1 in the seasons tests.
import { beforeAll, describe, expect, it } from "vitest";
import { api, seasons } from "./helpers";

let current: string;
beforeAll(async () => {
  ({ current } = await seasons());
});

describe("cross-site write guard", () => {
  const reportPath = () => `/api/seasons/${current}/matches/x/reports`;
  it("refuses a write without an Origin", async () => {
    const r = await api("POST", reportPath(), { reason: "test" }, { origin: null });
    expect(r.status).toBe(403);
  });
  it("refuses a write from another site", async () => {
    const r = await api("POST", reportPath(), { reason: "test" }, { origin: "https://evil.example" });
    expect(r).toMatchObject({ status: 403, body: { error: { code: "forbidden", message: "Cross-site request refused" } } });
  });
  it("lets our own pages' writes through", async () => {
    expect((await api("POST", reportPath(), { reason: "test" })).status).toBe(401); // past the guard; no session
  });
  it("needs no Origin for reads", async () => {
    expect((await api("GET", "/api/seasons", undefined, { origin: null })).status).toBe(200);
  });
});
