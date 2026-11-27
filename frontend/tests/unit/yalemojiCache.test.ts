// The account button's Yalemoji cache (lib/yalemojiCache.ts), with small
// fakes of window, document, storage and the API: Yalies' cases
// (apps/web/tests/yalemojiCache.test.mjs) without the banner's.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MyYalemoji } from "@/lib/api/me";

const avatar = (version: number) => ({
  version,
  pngUrl: `https://assets.example/${version}/avatar.png`,
  backgroundUrl: `https://assets.example/${version}/background.svg`,
});

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}
type FakeStorage = ReturnType<typeof storage>;
const disabled: FakeStorage = {
  getItem: () => { throw new Error("disabled"); },
  setItem: () => { throw new Error("disabled"); },
  removeItem: () => { throw new Error("disabled"); },
};

function events() {
  const listeners = new Map<string, Set<() => void>>();
  return {
    addEventListener: (name: string, fn: () => void) => void (listeners.get(name) ?? listeners.set(name, new Set()).get(name)!).add(fn),
    removeEventListener: (name: string, fn: () => void) => void listeners.get(name)?.delete(fn),
    emit: (name: string) => [...(listeners.get(name) ?? [])].forEach((fn) => fn()),
  };
}

/** A fresh page: the module loaded anew, over `local` and `session` storage (kept across "page loads" when passed). */
async function page({ local = storage(), session = storage(), loading = false } = {}) {
  vi.resetModules();
  const window = events();
  const document = { ...events(), visibilityState: "visible", readyState: loading ? "loading" : "complete" };
  let answer: () => Response = () => Response.json({ netid: "abc123", yalemoji: avatar(3) } satisfies MyYalemoji);
  const fetch = vi.fn(async (_path: string) => answer());
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", document);
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("fetch", fetch);
  const cache = await import("@/lib/yalemojiCache");
  /** Subscribes like a button; `shown()` is what it would show now. */
  const button = (netid = "abc123") => {
    const unsubscribe = cache.subscribeYalemoji(netid, () => undefined);
    return { unsubscribe, shown: () => cache.yalemojiOf(netid) };
  };
  return {
    cache, fetch, window, document, local, session, button,
    answer: (body: MyYalemoji | "down" | "offline") => {
      answer = () => {
        if (body === "offline") throw new TypeError("Failed to fetch");
        return body === "down" ? Response.json({ error: { code: "unavailable", message: "" } }, { status: 503 }) : Response.json(body);
      };
    },
  };
}

const stored = (netid: string, value: unknown) => {
  const local = storage();
  local.setItem("yaleims-yalemoji", JSON.stringify({ netid, avatar: value }));
  return local;
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the Yalemoji cache", () => {
  it("shows a stored avatar at once and checks it 5 s after the page has loaded", async () => {
    const p = await page({ local: stored("abc123", avatar(3)) });
    const button = p.button();
    expect(button.shown()).toEqual(avatar(3));
    await vi.advanceTimersByTimeAsync(4999);
    expect(p.fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(p.fetch).toHaveBeenCalledOnce();
    expect(p.fetch.mock.calls[0][0]).toBe("/api/me/yalemoji");
  });

  it("waits for the load event before starting the 5 s", async () => {
    const p = await page({ local: stored("abc123", avatar(3)), loading: true });
    p.button();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(p.fetch).not.toHaveBeenCalled();
    p.window.emit("load");
    await vi.advanceTimersByTimeAsync(5000);
    expect(p.fetch).toHaveBeenCalledOnce();
  });

  it("asks at once when nothing usable is stored: none, absence, malformed, http, another person's", async () => {
    for (const local of [
      storage(), stored("abc123", null), stored("abc123", {}), stored("abc123", { ...avatar(3), version: 0 }),
      stored("abc123", { ...avatar(3), pngUrl: "http://assets.example/a.png" }), stored("other1", avatar(3)),
    ]) {
      local.setItem("unrelated", "x");
      const p = await page({ local });
      const button = p.button();
      expect(button.shown()).toBeUndefined();
      expect(p.fetch).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(0);
      expect(button.shown()).toEqual(avatar(3));
    }
  });

  it("asks once per page, for every button and across page changes, even when there is none", async () => {
    const p = await page();
    p.answer({ netid: "abc123", yalemoji: null });
    const first = p.button();
    p.button();
    await vi.advanceTimersByTimeAsync(0);
    expect(first.shown()).toBeNull();
    first.unsubscribe();
    await vi.advanceTimersByTimeAsync(60_000);
    p.button();
    expect(p.fetch).toHaveBeenCalledOnce();
  });

  it("keeps the pending check when the buttons unmount and remount (a page change)", async () => {
    const p = await page({ local: stored("abc123", avatar(3)) });
    const button = p.button();
    await vi.advanceTimersByTimeAsync(2000);
    button.unsubscribe();
    p.button();
    await vi.advanceTimersByTimeAsync(3000);
    expect(p.fetch).toHaveBeenCalledOnce();
  });

  it("ignores focus unless the person went to Yalemoji; back from it, asks once and drops the delayed check", async () => {
    const p = await page({ local: stored("abc123", avatar(3)) });
    p.button();
    p.window.emit("focus");
    p.document.emit("visibilitychange");
    expect(p.fetch).not.toHaveBeenCalled();
    p.cache.markYalemojiVisit();
    p.document.visibilityState = "hidden";
    p.document.emit("visibilitychange");
    expect(p.fetch).not.toHaveBeenCalled();
    p.document.visibilityState = "visible";
    p.document.emit("visibilitychange");
    p.window.emit("focus");
    await vi.advanceTimersByTimeAsync(5000);
    expect(p.fetch).toHaveBeenCalledOnce();
    p.cache.markYalemojiVisit(); // a second visit asks again
    p.window.emit("pageshow");
    await vi.advanceTimersByTimeAsync(0);
    expect(p.fetch).toHaveBeenCalledTimes(2);
  });

  it("back from Yalemoji, every button shows the new avatar, or its removal, and it is stored", async () => {
    const p = await page({ local: stored("abc123", avatar(3)) });
    const [first, second] = [p.button(), p.button()];
    p.answer({ netid: "abc123", yalemoji: avatar(4) });
    p.cache.markYalemojiVisit();
    p.window.emit("focus");
    await vi.advanceTimersByTimeAsync(0);
    expect([first.shown(), second.shown()]).toEqual([avatar(4), avatar(4)]);
    expect(JSON.parse(p.local.getItem("yaleims-yalemoji")!).avatar.version).toBe(4);
    p.answer({ netid: "abc123", yalemoji: null });
    p.cache.markYalemojiVisit();
    p.window.emit("focus");
    await vi.advanceTimersByTimeAsync(0);
    expect([first.shown(), second.shown()]).toEqual([null, null]);
  });

  it("a page load uses the stored avatar; after a visit in the same tab, it asks at once", async () => {
    const first = await page();
    first.button();
    await vi.advanceTimersByTimeAsync(0);
    const reload = await page({ local: first.local, session: first.session });
    reload.button();
    expect(reload.fetch).not.toHaveBeenCalled();
    reload.cache.markYalemojiVisit();
    const back = await page({ local: first.local, session: first.session });
    back.button();
    expect(back.fetch).toHaveBeenCalledOnce();
  });

  it("keeps the avatar when Yalemoji is down or the browser is offline", async () => {
    for (const failure of ["down", "offline"] as const) {
      const p = await page({ local: stored("abc123", avatar(3)) });
      p.answer(failure);
      const button = p.button();
      await vi.advanceTimersByTimeAsync(5000);
      expect(p.fetch).toHaveBeenCalledOnce();
      expect(button.shown()).toEqual(avatar(3));
      expect(p.local.getItem("yaleims-yalemoji")).not.toBeNull();
    }
  });

  it("ignores an answer for another NetID, and one that arrives after sign-out", async () => {
    const p = await page();
    p.answer({ netid: "other1", yalemoji: avatar(9) });
    const button = p.button();
    await vi.advanceTimersByTimeAsync(0);
    expect(button.shown()).toBeUndefined();

    const q = await page();
    const late = q.button();
    q.cache.clearYalemojiCache(); // before the answer arrives
    await vi.advanceTimersByTimeAsync(0);
    expect(late.shown()).toBeUndefined();
    expect(q.local.getItem("yaleims-yalemoji")).toBeNull();
  });

  it("sign-out forgets the avatar and the visit mark", async () => {
    const p = await page({ local: stored("abc123", avatar(3)) });
    p.button();
    p.cache.markYalemojiVisit();
    p.cache.clearYalemojiCache();
    expect(p.local.getItem("yaleims-yalemoji")).toBeNull();
    expect(p.session.getItem("yaleims-yalemoji-return")).toBeNull();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(p.fetch).not.toHaveBeenCalled(); // the delayed check went too
  });

  it("works without storage (private mode)", async () => {
    const p = await page({ local: disabled, session: disabled });
    p.answer({ netid: "abc123", yalemoji: null });
    const button = p.button();
    await vi.advanceTimersByTimeAsync(0);
    expect(button.shown()).toBeNull();
    p.answer({ netid: "abc123", yalemoji: avatar(1) });
    p.cache.markYalemojiVisit();
    p.window.emit("focus");
    await vi.advanceTimersByTimeAsync(0);
    expect(button.shown()).toEqual(avatar(1));
    p.cache.clearYalemojiCache();
  });
});
