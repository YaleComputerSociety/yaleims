import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, toJson } from "@/lib/api/core";

describe("toJson", () => {
  it("turns timestamps and Dates into ISO strings, anywhere in the value", () => {
    const at = new Date("2026-11-01T15:00:00Z");
    const stored = { seconds: at.getTime() / 1000, nanoseconds: 0, toDate: () => at, toMillis: () => at.getTime() };
    expect(toJson({ startsAt: stored, result: { scoredAt: null }, times: [at], id: "7", points: 3 })).toEqual({
      startsAt: "2026-11-01T15:00:00.000Z",
      result: { scoredAt: null },
      times: ["2026-11-01T15:00:00.000Z"],
      id: "7",
      points: 3,
    });
  });
});

describe("ApiError", () => {
  it("knows its status and its response body", () => {
    const error = new ApiError("conflict", "Not the current season.", { seasonId: "2025-2026" });
    expect(error.status).toBe(409);
    expect(error.toBody()).toEqual({
      error: { code: "conflict", message: "Not the current season.", details: { seasonId: "2025-2026" } },
    });
  });
});

describe("request", () => {
  afterEach(() => vi.unstubAllGlobals());
  const answer = (response: Response) => {
    const fetch = vi.fn(async () => response);
    vi.stubGlobal("fetch", fetch);
    return fetch;
  };

  it("sends JSON bodies and query parameters (null ones left out)", async () => {
    const fetch = answer(Response.json({ id: "x" }, { status: 201 }));
    const body = await request("POST", "/api/seasons/s/matches", { query: { a: 1, b: null }, body: { sportId: "1" } });
    expect(body).toEqual({ id: "x" });
    expect(fetch).toHaveBeenCalledWith("/api/seasons/s/matches?a=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"sportId":"1"}',
    });
  });
  it("returns undefined for 204", async () => {
    answer(new Response(null, { status: 204 }));
    expect(await request("DELETE", "/api/x")).toBeUndefined();
  });
  it("throws the server's error", async () => {
    answer(Response.json({ error: { code: "forbidden", message: "No." } }, { status: 403 }));
    await expect(request("GET", "/api/x")).rejects.toMatchObject({ code: "forbidden", status: 403, message: "No." });
  });
  it("throws a generic error when the answer isn't an API error", async () => {
    answer(new Response("Internal Server Error", { status: 500 }));
    await expect(request("GET", "/api/x")).rejects.toMatchObject({ code: "internal" });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    await expect(request("GET", "/api/x")).rejects.toMatchObject({ code: "internal" });
  });
});
