// The route wrapper and request parsing (server/http.ts), called directly
// with Request objects; the session is stubbed.
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@/server/session", () => ({ getIdentity: async () => ({ userId: "player001@example.edu", netid: "p001" }) }));

const { ApiError } = await import("@/lib/api/core");
const { noContent, ok, readBody, readQuery, route } = await import("@/server/http");

const call = (handler: ReturnType<typeof route>, req = new Request("http://x/api/test")) =>
  handler(req, { params: Promise.resolve({}) });

describe("route", () => {
  it("returns the handler's response", async () => {
    expect((await call(route(async () => ok({ a: 1 })))).status).toBe(200);
    expect((await call(route(async () => noContent()))).status).toBe(204);
  });
  it("turns an ApiError into its status and body", async () => {
    const res = await call(route(async () => {
      throw new ApiError("not-found", "No such game.");
    }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not-found", message: "No such game." } });
  });
  it("turns anything else into a generic 500 and logs it with the route and viewer", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call(route(async () => {
      throw new Error("secret detail");
    }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret detail");
    const line = JSON.parse(log.mock.calls[0][0]);
    expect(line).toMatchObject({ severity: "ERROR", message: "GET /api/test failed", viewer: "player001@example.edu" });
    expect(line.error).toContain("secret detail");
    log.mockRestore();
  });
});

describe("readBody", () => {
  const schema = z.strictObject({ sportId: z.string(), week: z.number().int().positive() });
  const post = (body: string, type: string | null = "application/json") =>
    new Request("http://x/api/test", { method: "POST", body, headers: type ? { "Content-Type": type } : {} });
  const refusal = (promise: Promise<unknown>) => promise.then(() => null, (error) => error);

  it("parses a matching JSON body", async () => {
    expect(await readBody(post('{"sportId":"1","week":3}', "application/json; charset=utf-8"), schema)).toEqual({ sportId: "1", week: 3 });
  });
  it("refuses a body that isn't sent as JSON", async () => {
    expect(await refusal(readBody(post('{"sportId":"1","week":3}', "text/plain"), schema))).toMatchObject({ code: "bad-request" });
    expect(await refusal(readBody(post('{"sportId":"1","week":3}', null), schema))).toMatchObject({ code: "bad-request" });
    expect(await refusal(readBody(post("{oops"), schema))).toMatchObject({ code: "bad-request", message: "The request body isn't valid JSON." });
  });
  it("refuses wrong and unknown fields, naming them", async () => {
    const wrong = await refusal(readBody(post('{"sportId":"1","week":0}'), schema));
    expect(wrong).toMatchObject({ code: "bad-request" });
    expect(wrong.message).toMatch(/^week: /);
    const unknown = await refusal(readBody(post('{"sportId":"1","week":3,"admin":true}'), schema));
    expect(unknown.details.issues[0].message).toContain("admin");
  });
});

describe("readQuery", () => {
  it("parses the query parameters", () => {
    const schema = z.strictObject({ page: z.coerce.number().int().min(1).default(1), collegeId: z.string().optional() });
    expect(readQuery(new Request("http://x/api/test?page=2&collegeId=MC"), schema)).toEqual({ page: 2, collegeId: "MC" });
    expect(readQuery(new Request("http://x/api/test"), schema)).toEqual({ page: 1 });
    expect(() => readQuery(new Request("http://x/api/test?page=0"), schema)).toThrow(ApiError);
  });
});
