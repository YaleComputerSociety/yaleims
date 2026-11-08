// The directory lookup (server/directory.ts), with Yalies stubbed: exact
// NetID matches only, each field checked on its own.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { lookUpNetid } = await import("@/server/directory");

beforeEach(() => {
  process.env.YALIES_API_KEY = "test-key";
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const answer = (body: string | object, status = 200) => {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status })
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};
const ada = { netid: "al1", email: "ada.l@yale.edu", first_name: "Ada", last_name: "L", college: "Morse College" };

describe("lookUpNetid", () => {
  it("finds the exact NetID, asked for exactly, with every field", async () => {
    const fetch = answer([ada]);
    expect(await lookUpNetid("al1")).toEqual({
      outcome: "found", person: { netid: "al1", name: "Ada L", email: "ada.l@yale.edu", college: "Morse College" },
    });
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: "POST", headers: { Authorization: "Bearer test-key" } });
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).filters).toEqual({ netid: "al1" });
  });

  it("keeps what's usable of an incomplete record: partial", async () => {
    answer([{ netid: "al1", first_name: "Ada", last_name: " ", college: "Morse College" }]);
    expect(await lookUpNetid("al1")).toEqual({ outcome: "partial", person: { netid: "al1", name: "Ada", email: null, college: "Morse College" } });
    answer([{ ...ada, email: "ada@gmail.com" }]); // not a Yale address
    expect((await lookUpNetid("al1")).person).toMatchObject({ email: null, name: "Ada L" });
    answer([{ netid: "AL1" }]); // the NetID alone
    expect(await lookUpNetid("al1")).toEqual({ outcome: "partial", person: { netid: "al1", name: null, email: null, college: null } });
  });

  it("trusts nothing but one record of that NetID: not-found", async () => {
    answer([]);
    expect(await lookUpNetid("al1")).toEqual({ outcome: "not-found", person: null });
    answer([{ ...ada, netid: "al2" }, { first_name: "No", last_name: "NetID" }]);
    expect((await lookUpNetid("al1")).outcome).toBe("not-found");
    answer([ada, { ...ada, first_name: "Other" }]);
    expect((await lookUpNetid("al1")).outcome).toBe("not-found");
  });

  it("is unavailable when Yalies is down, misconfigured or answers nonsense", async () => {
    answer("busy", 503);
    expect(await lookUpNetid("al1")).toEqual({ outcome: "unavailable", person: null });
    answer({ not: "a list" });
    expect((await lookUpNetid("al1")).outcome).toBe("unavailable");
    delete process.env.YALIES_API_KEY;
    expect((await lookUpNetid("al1")).outcome).toBe("unavailable");
  });
});
