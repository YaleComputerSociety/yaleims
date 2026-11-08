// Local sign-in without Yale CAS: prints a session cookie for a user of the
// local emulator data (npm run seed), signed with your local JWT_SECRET, and
// the line to paste into the browser console. The app then treats you as
// that user; their name, roles, and college come from Firestore on
// each request, as after a real login.
//
//   npm run dev:token -- dev@example.edu   (a user id: the seed's are emails)
//
// Local development only: it adds nothing to the app (no special login route),
// and a cookie signed with your local secret means nothing to production.
import { readFileSync } from "node:fs";
import jwt from "jsonwebtoken";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: npm run dev:token -- <user id>   (e.g. dev@example.edu, player001@example.edu)");
  process.exit(1);
}

/** JWT_SECRET from the environment, else from .env.local (where `next dev` reads it). */
function localSecret(): string | undefined {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  try {
    return readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^JWT_SECRET=(.*)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}
const secret = localSecret();
if (!secret) {
  console.error("No JWT_SECRET: add one to frontend/.env.local (any long random string) and restart `npm run dev:emulator`.");
  process.exit(1);
}

/**
 * The user's NetID from the local emulator (the cookie carries the one CAS
 * gave); a user without one recorded gets the start of their id, recorded
 * at their first visit as for users from before NetIDs were kept.
 */
async function netidOf(id: string): Promise<string> {
  const fallback = id.replace(/^netid-/, "").split("@")[0].toLowerCase();
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-yims";
  try {
    // "Bearer owner" is the emulator's admin access: the security rules don't let the browser read users.
    const res = await fetch(`http://${host}/v1/projects/${project}/databases/(default)/documents/users/${encodeURIComponent(id)}`, {
      headers: { Authorization: "Bearer owner" },
    });
    if (res.ok) return (await res.json()).fields?.netid?.stringValue ?? fallback;
  } catch {
    // Emulator not running: fall through.
  }
  console.warn(`(${id} isn't a user in the local emulator; signing in anyway.)`);
  return fallback;
}

const token = jwt.sign({ v: 2, userId, netid: await netidOf(userId) }, secret, { expiresIn: "7d" });
console.log(
  `Signed in as ${userId} for 7 days. In the browser console on the local site, run:\n\n` +
    `document.cookie = "token=${token}; path=/"; location.reload();\n`
);
