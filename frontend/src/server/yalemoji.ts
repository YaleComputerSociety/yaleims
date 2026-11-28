// Yalemoji (www.yalemoji.com), the y/cs avatar app: the signed-in person's
// avatar for the account button. Only this module holds the app key; the
// browser gets the avatar's public asset URLs from GET /api/me/yalemoji.
// Modeled on Yalies' helper (apps/api/src/helpers/yalemojiAvatar.ts): a 404
// means "has none" (null), anything else that goes wrong means "can't tell
// right now" (undefined), so an outage never reads as "make your Yalemoji".
// Each answer is reused for a few seconds: a signed-in person calling
// GET /api/me/yalemoji in a loop reaches Yalemoji, under our key, at most
// once per REUSE_MS per server instance.
// YALEMOJI_API_URL points it elsewhere (the integration tests' fake).
import "server-only";
import type { YalemojiAvatar } from "@/lib/api/me";
import { NETID_PATTERN } from "@/lib/netid";

type Answer = YalemojiAvatar | null | undefined;

/** Shorter than an edit on Yalemoji takes, so coming back from one still shows the new avatar. */
const REUSE_MS = 5_000;
/** Recent lookups by NetID, pending ones included (simultaneous requests share one). */
const recent = new Map<string, { at: number; answer: Promise<Answer> }>();

/** The avatar of `netid`; null: Yalemoji says they have none; undefined: unavailable (no key, outage, nonsense). */
export function getYalemojiAvatar(netid: string): Promise<Answer> {
  const key = process.env.YALEMOJI_API_KEY;
  const id = netid.toLowerCase(); // the API doesn't lowercase: "ZZ1" is a 404
  if (!key || !NETID_PATTERN.test(id)) return Promise.resolve(undefined);
  const now = Date.now();
  const reused = recent.get(id);
  if (reused && now - reused.at < REUSE_MS) return reused.answer;
  for (const [stale, { at }] of recent) if (now - at >= REUSE_MS) recent.delete(stale);
  const answer = lookUp(id, key);
  recent.set(id, { at: now, answer });
  return answer;
}

async function lookUp(id: string, key: string): Promise<Answer> {
  try {
    const res = await fetch(new URL(`/api/v1/users/${encodeURIComponent(id)}`, apiOrigin()), {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(3000),
      // The apex domain redirects to www; a redirect anywhere else is not followed with the key.
      redirect: "error",
      // A success says max-age=300: a cached answer would hide an edit made on Yalemoji.
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`answered ${res.status}`);
    const avatar = parseAvatar(((await res.json()) as { avatar?: unknown } | null)?.avatar);
    if (!avatar) throw new Error("answered an invalid avatar");
    return avatar;
  } catch (error) {
    // The button falls back to initials; one line, without the request's headers.
    console.warn(`Yalemoji lookup unavailable: ${(error as Error).message}`);
    return undefined;
  }
}

/** https://www.yalemoji.com, or YALEMOJI_API_URL: https only (plain http on localhost while developing). */
function apiOrigin(): URL {
  const origin = new URL(process.env.YALEMOJI_API_URL ?? "https://www.yalemoji.com");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  const devFake = origin.protocol === "http:" && local && process.env.NODE_ENV === "development";
  if (origin.username || origin.password || !(origin.protocol === "https:" || devFake)) {
    throw new Error("YALEMOJI_API_URL must be an https origin");
  }
  return origin;
}

/** The fields the page uses, checked: a positive version and https asset URLs. */
function parseAvatar(value: unknown): YalemojiAvatar | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { version, png_url, background_url } = value as Record<string, unknown>;
  const pngUrl = assetUrl(png_url);
  const backgroundUrl = assetUrl(background_url);
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1 || !pngUrl || !backgroundUrl) {
    return undefined;
  }
  return { version, pngUrl, backgroundUrl };
}

/** An https URL without credentials, normalized (as `new URL` writes it); else null. */
function assetUrl(value: unknown): string | null {
  if (typeof value !== "string" || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
}
