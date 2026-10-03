// sanitize.mjs
// ----------------------------------------------------------------------------
// Reads data/prod-dump.json (real PII) and writes data/seed.json for local use
// in the emulator. Deterministic (same input -> same output) so foreign keys
// stay consistent across the dataset.
//
// What it anonymizes:
//   * every email address, in both forms the app uses:
//       dot form         first.last@yale.edu   (doc ids, fields, arrays)
//       underscore form  first_last@yale_edu   (old betting `predictions` keys)
//     in paths, map keys and string values -> user{n}@example.edu / _edu
//   * person names, only where they belong to a person:
//       users docs (firstname, lastname), objects that carry an email
//       (participants etc.), MVP entries (keyed by email), score reports
//       (reportedBy, resolvedBy), and any string equal to a real full name.
//     College, sport and tournament `name` fields are left alone.
//   * usernames (users.username and the usernames/{username} doc ids)
//
// After rewriting, it re-scans the output and REFUSES to write seed.json if
// any real email or real full name is still present.
// ----------------------------------------------------------------------------
import { readFile, writeFile } from "node:fs/promises";

const IN = new URL("./data/prod-dump.json", import.meta.url);
const OUT = new URL("./data/seed.json", import.meta.url);

const dump = JSON.parse(await readFile(IN, "utf8"));

const DOT_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const UNDER_EMAIL = /[A-Za-z0-9_%+-]+@[A-Za-z0-9_-]+_(?:edu|com|org|net)\b/g;
const toUnder = (email) => email.replace(/\./g, "_");

// --- 1. Assign a stable fake identity to every real email -------------------

const fakeIndex = new Map(); // real dot-form email -> n
const underToDot = new Map(); // real underscore form -> real dot form
function indexFor(email) {
  if (!fakeIndex.has(email)) {
    fakeIndex.set(email, fakeIndex.size + 1);
    underToDot.set(toUnder(email), email);
  }
  return fakeIndex.get(email);
}

// Users first (sorted) so user{n} numbering is stable, then every other email.
const userPaths = Object.keys(dump).filter((p) => /^users\/[^/]+$/.test(p)).sort();
for (const p of userPaths) indexFor(p.split("/")[1]);
const allText = JSON.stringify(dump) + "\n" + Object.keys(dump).join("\n");
for (const e of [...new Set(allText.match(DOT_EMAIL) ?? [])].sort()) indexFor(e);
// Underscore-form emails whose dot form we never saw still need a fake.
const orphanUnder = new Map();
for (const u of [...new Set(allText.match(UNDER_EMAIL) ?? [])].sort()) {
  if (!underToDot.has(u)) orphanUnder.set(u, fakeIndex.size + orphanUnder.size + 1);
}

const fakeEmail = (n) => `user${n}@example.edu`;
const fakeFirst = (n) => `Test${n}`;
const fakeLast = (n) => `User${n}`;
const fakeFull = (n) => `Test${n} User${n}`;
const fakeUsername = (n) => `user${n}`;

// --- 2. Real names, so they can be scrubbed wherever they appear ------------

const realFullToIndex = new Map(); // "First Last" -> n
const realNames = { first: new Set(), last: new Set() };
for (const p of userPaths) {
  const d = dump[p] ?? {};
  const n = fakeIndex.get(p.split("/")[1]);
  if (typeof d.firstname === "string") realNames.first.add(d.firstname);
  if (typeof d.lastname === "string") realNames.last.add(d.lastname);
  if (d.firstname && d.lastname) realFullToIndex.set(`${d.firstname} ${d.lastname}`, n);
}
// Longest first, so "Ann Lee-Smith" is replaced before "Ann Lee".
const fullNamesByLength = [...realFullToIndex.keys()].sort((a, b) => b.length - a.length);

// --- 3. Scrubbing helpers -------------------------------------------------

function scrubString(s) {
  let out = s.replace(DOT_EMAIL, (e) => (fakeIndex.has(e) ? fakeEmail(fakeIndex.get(e)) : e));
  out = out.replace(UNDER_EMAIL, (u) => {
    const n = underToDot.has(u) ? fakeIndex.get(underToDot.get(u)) : orphanUnder.get(u);
    return n ? toUnder(fakeEmail(n)) : u;
  });
  for (const full of fullNamesByLength) {
    if (out.includes(full)) out = out.split(full).join(fakeFull(realFullToIndex.get(full)));
  }
  return out;
}

/** The fake index of the person an object describes, if it carries an email. */
function ownerOf(obj) {
  for (const k of ["email", "userId", "reportedByEmail"]) {
    const v = obj[k];
    if (typeof v === "string" && fakeIndex.has(v)) return fakeIndex.get(v);
  }
  return null;
}

/** Fake person fields for an object owned by person n. */
function fakePersonField(key, value, n) {
  switch (key) {
    case "firstname":
    case "firstName":
    case "fname":
      return fakeFirst(n);
    case "lastname":
    case "lastName":
    case "lname":
      return fakeLast(n);
    case "name":
    case "reportedBy":
      return fakeFull(n);
    case "username":
      return fakeUsername(n);
    case "netid":
      return `netid${n}`;
    default:
      return undefined;
  }
}

function sanitizeValue(value, owner) {
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, null));
  if (value && typeof value === "object") {
    if (value.__t) {
      // Encoded Firestore type sentinel; only refs carry a path worth scrubbing.
      return value.__t === "ref" ? { ...value, path: scrubString(value.path) } : value;
    }
    const n = ownerOf(value) ?? owner;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const key = scrubString(k);
      // A map keyed by email (MVP entries): the value describes that person.
      const keyOwner = fakeIndex.has(k) ? fakeIndex.get(k) : null;
      const personValue = n != null ? fakePersonField(k, v, n) : undefined;
      if (personValue !== undefined) out[key] = personValue;
      else if (k === "resolvedBy" && typeof v === "string")
        out[key] = realFullToIndex.has(v) ? fakeFull(realFullToIndex.get(v)) : "Admin User";
      else out[key] = sanitizeValue(v, keyOwner);
    }
    return out;
  }
  return value;
}

// --- 4. Rewrite every document --------------------------------------------

const seed = {};
for (const [path, data] of Object.entries(dump)) {
  let newPath = scrubString(path);
  let owner = null;
  const userMatch = path.match(/^users\/([^/]+)/);
  if (userMatch) owner = fakeIndex.get(userMatch[1]) ?? null;
  // usernames/{username}: the id is a username; rename it after the owner.
  const unameMatch = path.match(/^usernames\/[^/]+$/);
  if (unameMatch) {
    // A user can own several usernames docs (an old one is kept after a
    // rename). The base id goes to the first; the rest get a suffix.
    const o = data && (ownerOf(data) ?? null);
    const base = o != null ? `usernames/${fakeUsername(o)}` : "usernames/unknown";
    newPath = base;
    for (let k = 2; newPath in seed; k++) newPath = `${base}-${k}`;
  }
  if (newPath in seed) throw new Error(`Two docs sanitize to the same path: ${newPath}`);
  seed[newPath] = sanitizeValue(data ?? {}, owner);
}
if (Object.keys(seed).length !== Object.keys(dump).length) {
  throw new Error(`Doc count changed: ${Object.keys(dump).length} in, ${Object.keys(seed).length} out`);
}

// --- 5. Leak check: refuse to write if anything real survived --------------

const outText = JSON.stringify(seed) + "\n" + Object.keys(seed).join("\n");
const problems = [];
const realDomains = (outText.match(DOT_EMAIL) ?? []).filter((e) => !e.endsWith("@example.edu"));
if (realDomains.length) problems.push(`${realDomains.length} non-fake emails (dot form)`);
const realUnder = (outText.match(UNDER_EMAIL) ?? []).filter((e) => !e.endsWith("@example_edu"));
if (realUnder.length) problems.push(`${realUnder.length} non-fake emails (underscore form)`);
const fullLeft = fullNamesByLength.filter((f) => outText.includes(f));
if (fullLeft.length) problems.push(`${fullLeft.length} real full names`);

// Single first/last names can collide with ordinary words (a last name "Hall"
// vs. a location), so report where they remain instead of failing.
const nameHits = {};
const scan = (v, where) => {
  if (typeof v === "string") {
    if (realNames.first.has(v) || realNames.last.has(v)) nameHits[where] = (nameHits[where] ?? 0) + 1;
  } else if (Array.isArray(v)) v.forEach((x) => scan(x, where));
  else if (v && typeof v === "object" && !v.__t)
    for (const [k, x] of Object.entries(v)) scan(x, `${where}.${k}`);
};
for (const [p, d] of Object.entries(seed)) {
  const col = p.split("/").filter((_, i) => i % 2 === 0).join("/");
  scan(d, col);
}

if (problems.length) {
  console.error(`REFUSING to write seed.json, real PII remains: ${problems.join("; ")}`);
  process.exit(1);
}

await writeFile(OUT, JSON.stringify(seed, null, 2));
console.log(
  `Sanitized ${Object.keys(seed).length} docs (${userPaths.length} users, ` +
    `${fakeIndex.size + orphanUnder.size} distinct emails) -> data/seed.json`
);
console.log("Leak check passed: no real emails or full names remain.");
const hitList = Object.entries(nameHits);
if (hitList.length) {
  console.log("Review: string values equal to a real first or last name (may be ordinary words):");
  for (const [where, c] of hitList.sort((a, b) => b[1] - a[1])) console.log(`  ${where}: ${c}`);
}
