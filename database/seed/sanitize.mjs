// sanitize.mjs
// ----------------------------------------------------------------------------
// Reads data/prod-dump.json (real PII) and writes data/seed.json (safe to use
// locally and to commit as the shared seed snapshot).
//
// What it anonymizes, deterministically (same input -> same output, so foreign
// keys stay consistent across the dataset):
//   * user doc IDs: users/{realEmail}/...  ->  users/{fakeEmail}/...
//     (the email is the primary key and is referenced from bets/matches, so the
//      whole path prefix is rewritten and every embedded occurrence is replaced)
//   * PII fields: email, name, firstName, lastName, fname, lname, netid, username
//   * any string value anywhere that equals a known real email
//
// Assumption: real user emails are the doc IDs of the top-level `users`
// collection. If that changes, update collectRealEmails().
// ----------------------------------------------------------------------------
import { readFile, writeFile } from "node:fs/promises";

const IN = new URL("./data/prod-dump.json", import.meta.url);
const OUT = new URL("./data/seed.json", import.meta.url);

const PII_FIELDS = new Set([
  "email",
  "name",
  "firstName",
  "lastName",
  "fname",
  "lname",
  "netid",
  "username",
]);

const dump = JSON.parse(await readFile(IN, "utf8"));

// 1. Collect every real email (doc id of users/{email}) and assign a stable fake.
const emailToFake = new Map();
let nextUser = 1;
function fakeEmailFor(real) {
  if (!emailToFake.has(real)) {
    emailToFake.set(real, `user${nextUser}@example.edu`);
    nextUser += 1;
  }
  return emailToFake.get(real);
}
for (const path of Object.keys(dump)) {
  const m = path.match(/^users\/([^/]+)/);
  if (m) fakeEmailFor(decodeURIComponent(m[1]));
}

// Deterministic fakes for the user index behind a given fake email.
const idxOf = (fakeEmail) => fakeEmail.match(/^user(\d+)@/)?.[1] ?? "0";

function fakeField(key, value, ownerFakeEmail) {
  const n = idxOf(ownerFakeEmail);
  switch (key) {
    case "email":
      return typeof value === "string" && emailToFake.has(value)
        ? emailToFake.get(value)
        : ownerFakeEmail;
    case "name":
      return `Test User ${n}`;
    case "firstName":
    case "fname":
      return `Test${n}`;
    case "lastName":
    case "lname":
      return `User${n}`;
    case "netid":
      return `netid${n}`;
    case "username":
      return `user${n}`;
    default:
      return value;
  }
}

// Replace any embedded real-email substring in an arbitrary string.
function scrubString(s) {
  let out = s;
  for (const [real, fake] of emailToFake) {
    if (out.includes(real)) out = out.split(real).join(fake);
  }
  return out;
}

function sanitizeValue(value, ownerFakeEmail) {
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, ownerFakeEmail));
  if (value && typeof value === "object") {
    if (value.__t) return value; // encoded Firestore type sentinel — leave as-is
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = PII_FIELDS.has(k)
        ? fakeField(k, v, ownerFakeEmail)
        : sanitizeValue(v, ownerFakeEmail);
    }
    return out;
  }
  return value;
}

// 2. Rewrite paths + values.
const seed = {};
for (const [path, data] of Object.entries(dump)) {
  let newPath = path;
  let ownerFakeEmail = "user0@example.edu";
  const m = path.match(/^users\/([^/]+)(\/.*)?$/);
  if (m) {
    const realEmail = decodeURIComponent(m[1]);
    ownerFakeEmail = fakeEmailFor(realEmail);
    newPath = `users/${encodeURIComponent(ownerFakeEmail)}${m[2] ?? ""}`;
  }
  seed[newPath] = sanitizeValue(data, ownerFakeEmail);
}

await writeFile(OUT, JSON.stringify(seed, null, 2));
console.log(
  `Sanitized ${Object.keys(seed).length} docs across ${emailToFake.size} users -> data/seed.json`
);
