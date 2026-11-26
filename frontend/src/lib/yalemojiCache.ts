"use client";
// The signed-in person's Yalemoji, for the account button: one answer per
// NetID shared by every button for the life of the page, kept in
// localStorage so a page load shows it at once (adapted from Yalies'
// apps/web/src/hooks/yalemojiCache.ts, without its banner).
//   - Cached avatar: shown at once, then checked 5 s after the page has
//     loaded (an edit made elsewhere shows on the next page load).
//   - Nothing cached: asked at once.
//   - Back from Yalemoji (YalemojiLink marks the visit; the tab regains
//     focus or is shown again): asked again, so an edit shows without a reload.
//   - Yalemoji unreachable (503) or offline: the last avatar stays.
// localStorage is untrusted input (another script, an old format): what is
// read from it is checked again. Every storage call may throw (private
// mode, blocked storage), and the in-memory state still works then.
import { useCallback, useSyncExternalStore } from "react";
import { fetchMyYalemoji, type YalemojiAvatar } from "./api/me";

/** The avatar; null: they have none (Yalemoji said so); undefined: not known (yet). */
export type Yalemoji = YalemojiAvatar | null | undefined;

const STORAGE_KEY = "yaleims-yalemoji";
const RETURN_KEY = "yaleims-yalemoji-return";
const REFRESH_DELAY_MS = 5000;

interface Entry {
  value: Yalemoji;
  listeners: Set<() => void>;
  /** The first check has started or is scheduled: once per page, not once per button. */
  checked: boolean;
  inflight?: Promise<void>;
  cancelDelay?: () => void;
}

const entries = new Map<string, Entry>();
let returning = false;
let listeningForReturn = false;

// ── The hook ───────────────────────────────────────────────────────────────

/** The Yalemoji of `netid` (the session's), kept fresh; undefined while not known and on the server. */
export function useYalemoji(netid: string): Yalemoji {
  const subscribe = useCallback((onChange: () => void) => subscribeYalemoji(netid, onChange), [netid]);
  return useSyncExternalStore(subscribe, () => yalemojiOf(netid), () => undefined);
}

// ── The store ──────────────────────────────────────────────────────────────

/** Calls `onChange` whenever the Yalemoji of `netid` changes; the first subscriber starts the first check. */
export function subscribeYalemoji(netid: string, onChange: () => void): () => void {
  listenForReturn();
  const entry = entryOf(netid);
  entry.listeners.add(onChange);
  const first = !entry.checked;
  entry.checked = true;
  if (consumeReturnMark()) void refresh(netid, entry);
  else if (first && entry.value) refreshAfterLoad(netid, entry);
  else if (first) void refresh(netid, entry);
  // A pending check outlives the buttons: a page change unmounts and remounts them.
  return () => entry.listeners.delete(onChange);
}

/** What the buttons show for `netid` now. */
export const yalemojiOf = (netid: string): Yalemoji => entryOf(netid).value;

/** YalemojiLink, on a click to Yalemoji: check again when the person comes back. */
export function markYalemojiVisit(): void {
  returning = true;
  attempt(() => sessionStorage.setItem(RETURN_KEY, "true")); // survives a same-tab visit's page load
}

/** At sign-out: forget the avatar, so the next person on this browser never sees it. */
export function clearYalemojiCache(): void {
  for (const entry of entries.values()) entry.cancelDelay?.();
  entries.clear();
  returning = false;
  attempt(() => localStorage.removeItem(STORAGE_KEY));
  attempt(() => sessionStorage.removeItem(RETURN_KEY));
}

function entryOf(netid: string): Entry {
  let entry = entries.get(netid);
  if (!entry) {
    entry = { value: readStored(netid), listeners: new Set(), checked: false };
    entries.set(netid, entry);
  }
  return entry;
}

/** Asks the server (one request at a time per NetID) and tells the buttons. */
function refresh(netid: string, entry: Entry): Promise<void> {
  entry.cancelDelay?.();
  entry.cancelDelay = undefined;
  entry.inflight ??= fetchMyYalemoji()
    .then((mine) => {
      // Someone else's answer (a new sign-in), or one for a cache cleared since: not ours to show.
      if (mine.netid !== netid || entries.get(netid) !== entry) return;
      entry.value = mine.yalemoji;
      attempt(() => localStorage.setItem(STORAGE_KEY, JSON.stringify({ netid, avatar: mine.yalemoji })));
      entry.listeners.forEach((onChange) => onChange());
    })
    .catch(() => undefined) // unreachable or offline: keep what is shown
    .finally(() => (entry.inflight = undefined));
  return entry.inflight;
}

/** The check of a cached avatar: 5 s after the page's load event, so it never slows the page. */
function refreshAfterLoad(netid: string, entry: Entry): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => (timer = setTimeout(() => void refresh(netid, entry), REFRESH_DELAY_MS));
  entry.cancelDelay = () => {
    clearTimeout(timer);
    window.removeEventListener("load", schedule);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}

// ── Coming back from Yalemoji ──────────────────────────────────────────────

function listenForReturn(): void {
  if (listeningForReturn) return;
  listeningForReturn = true;
  window.addEventListener("focus", refreshOnReturn);
  window.addEventListener("pageshow", refreshOnReturn);
  document.addEventListener("visibilitychange", refreshOnReturn);
}

function refreshOnReturn(): void {
  if (document.visibilityState === "hidden") return;
  const shown = [...entries].filter(([, entry]) => entry.listeners.size > 0);
  if (shown.length === 0 || !consumeReturnMark()) return;
  for (const [netid, entry] of shown) void refresh(netid, entry);
}

/** Whether a Yalemoji visit is marked (in memory, or by this tab before a page load); clears the mark. */
function consumeReturnMark(): boolean {
  const marked = returning || attempt(() => sessionStorage.getItem(RETURN_KEY) === "true") === true;
  if (marked) {
    returning = false;
    attempt(() => sessionStorage.removeItem(RETURN_KEY));
  }
  return marked;
}

// ── Storage ────────────────────────────────────────────────────────────────

/** The stored avatar of `netid`, checked again; undefined for none, another person's or anything malformed. */
function readStored(netid: string): Yalemoji {
  const stored = attempt(() => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as unknown);
  if (typeof stored !== "object" || stored === null) return undefined;
  const { netid: owner, avatar } = stored as { netid?: unknown; avatar?: unknown };
  if (owner !== netid || typeof avatar !== "object" || avatar === null) return undefined;
  const { version, pngUrl, backgroundUrl } = avatar as Record<string, unknown>;
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1) return undefined;
  if (!isHttps(pngUrl) || !isHttps(backgroundUrl)) return undefined;
  return { version, pngUrl, backgroundUrl };
}

const isHttps = (value: unknown): value is string =>
  typeof value === "string" && URL.canParse(value) && new URL(value).protocol === "https:";

/** Runs a storage call; undefined when storage is unavailable. */
function attempt<T>(call: () => T): T | undefined {
  try {
    return call();
  } catch {
    return undefined;
  }
}
