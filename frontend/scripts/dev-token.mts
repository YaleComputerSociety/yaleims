// Local sign-in without Yale CAS: prints a session cookie for a user of the
// local emulator data (npm run seed), signed with your local JWT_SECRET, and
// the line to paste into the browser console. The app then treats you as
// that user; their roles, college and username come from Firestore on the
// next page load (/api/auth/verify), as after a real login.
//
//   npm run dev:token -- dev@example.edu
//
// Local development only: it adds nothing to the app (no special login route),
// and a cookie signed with your local secret means nothing to production.
import { readFileSync } from "node:fs";
import jwt from "jsonwebtoken";

const email = process.argv[2];
if (!email?.includes("@")) {
  console.error("Usage: npm run dev:token -- <email>   (e.g. dev@example.edu, player001@example.edu)");
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

/** The user's name from the local emulator, so the app greets them properly. */
async function nameOf(address: string): Promise<string> {
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "yims-125a2";
  try {
    const res = await fetch(`http://${host}/v1/projects/${project}/databases/(default)/documents/users/${encodeURIComponent(address)}`);
    const fields = res.ok ? (await res.json()).fields : null;
    if (fields) return `${fields.firstname.stringValue} ${fields.lastname.stringValue}`;
  } catch {
    // Emulator not running: fall through.
  }
  console.warn(`(${address} isn't a user in the local emulator; signing in anyway, as a new account would.)`);
  return address.split("@")[0];
}

const token = jwt.sign({ name: await nameOf(email), netid: email.split("@")[0], email }, secret, { expiresIn: "7d" });
console.log(
  `Signed in as ${email} for 7 days. In the browser console on the local site, run:\n\n` +
    `localStorage.setItem("logout_version", "2"); document.cookie = "token=${token}; path=/"; location.reload();\n`
);
