// The Yalemoji lookup (server/yalemoji.ts), with Yalemoji stubbed: Yalies'
// cases (apps/api/tests/yalemojiAvatar.test.mjs), plus the URL normalizing.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getYalemojiAvatar } = await import("@/server/yalemoji");

const asset = (file: string) => `https://storage.googleapis.com/yalemoji-avatars/avatars/opaque/3/${file}`;
const sent = { version: 3, png_url: asset("avatar.png"), svg_url: asset("avatar.svg"), background_url: asset("background.svg") };
const avatar = { version: 3, pngUrl: asset("avatar.png"), backgroundUrl: asset("background.svg") };

beforeEach(() => {
  vi.stubEnv("YALEMOJI_API_KEY", "test-key");
  vi.stubEnv("YALEMOJI_API_URL", undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const answer = (body: unknown, status = 200) => {
  const fetch = vi.fn(async (_url: URL, _init?: RequestInit) => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

describe("getYalemojiAvatar", () => {
  it("asks once, with the key and the lowercased NetID, and keeps only the fields the page uses", async () => {
    const fetch = answer({ netid: "abc123", avatar: { ...sent, private_data: "hidden" } });
    expect(await getYalemojiAvatar("ABC123")).toEqual(avatar);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://www.yalemoji.com/api/v1/users/abc123");
    expect(init).toMatchObject({ headers: { Authorization: "Bearer test-key" }, redirect: "error", cache: "no-store" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("doesn't ask without a key or for something that isn't a NetID", async () => {
    const fetch = answer({ avatar: sent });
    expect(await getYalemojiAvatar("../someone")).toBeUndefined();
    vi.stubEnv("YALEMOJI_API_KEY", undefined);
    expect(await getYalemojiAvatar("abc123")).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is null only when Yalemoji says there is none (404), and finds one made later", async () => {
    const fetch = answer({ error: "not_found" }, 404);
    expect(await getYalemojiAvatar("abc123")).toBeNull();
    fetch.mockImplementation(async () => Response.json({ avatar: sent }));
    expect(await getYalemojiAvatar("abc123")).toEqual(avatar);
  });

  it("is unavailable on a refused key, a rate limit, an outage or a timeout", async () => {
    const fetch = answer({});
    for (const status of [401, 429, 503]) {
      fetch.mockImplementation(async () => Response.json({ error: "unavailable" }, { status }));
      expect(await getYalemojiAvatar("abc123")).toBeUndefined();
    }
    fetch.mockImplementation(async () => {
      throw new DOMException("Timed out", "TimeoutError");
    });
    expect(await getYalemojiAvatar("abc123")).toBeUndefined();
  });

  it("refuses malformed avatars and unsafe asset URLs", async () => {
    const fetch = answer({});
    for (const invalid of [
      null, {}, { ...sent, version: 0 }, { ...sent, version: 1.5 }, { ...sent, png_url: "javascript:alert(1)" },
      { ...sent, background_url: "http://cdn/background.svg" }, { ...sent, png_url: "https://user:pw@cdn/avatar.png" },
    ]) {
      fetch.mockImplementation(async () => Response.json({ avatar: invalid }));
      expect(await getYalemojiAvatar("abc123")).toBeUndefined();
    }
    fetch.mockImplementation(async () => new Response("<html>", { status: 200 }));
    expect(await getYalemojiAvatar("abc123")).toBeUndefined();
  });

  it("sends the asset URLs normalized, quotes percent-encoded", async () => {
    answer({ avatar: { ...sent, png_url: 'https://cdn.example/a"b.png' } });
    expect((await getYalemojiAvatar("abc123"))?.pngUrl).toBe("https://cdn.example/a%22b.png");
  });

  it("reaches a local fake over http only while developing; never an insecure remote", async () => {
    const fetch = answer({ avatar: sent });
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("YALEMOJI_API_URL", "http://localhost:3002");
    expect(await getYalemojiAvatar("abc123")).toEqual(avatar);
    expect(String(fetch.mock.calls[0][0])).toBe("http://localhost:3002/api/v1/users/abc123");
    vi.stubEnv("YALEMOJI_API_URL", "http://yalemoji.com");
    expect(await getYalemojiAvatar("abc123")).toBeUndefined();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("YALEMOJI_API_URL", "http://localhost:3002");
    expect(await getYalemojiAvatar("abc123")).toBeUndefined();
    expect(fetch).toHaveBeenCalledOnce();
  });
});
