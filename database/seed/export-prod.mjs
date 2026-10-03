// export-prod.mjs
// ----------------------------------------------------------------------------
// Reads the SEED_COLLECTIONS from the PRODUCTION Firestore (yims-125a2) and
// writes a raw dump to ./data/prod-dump.json. This is a READ-ONLY operation
// against production, but it still pulls real user PII — the output is NOT safe
// to commit or share. Run `npm run sanitize` next to anonymize it.
//
// Auth: requires a service-account key. Point to it with
//   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/serviceaccount.json
// (the repo already gitignores database/misc/serviceaccount.json).
//
// The export is recursive: for every document it also walks nested
// subcollections, so the shape matches production exactly. Firestore-native
// types (Timestamp, GeoPoint, DocumentReference) are encoded with a sentinel
// so they survive the JSON round-trip and can be rebuilt on import.
// ----------------------------------------------------------------------------
import admin from "firebase-admin";
import { writeFile, mkdir } from "node:fs/promises";
import { SEED_COLLECTIONS, EXCLUDED_COLLECTIONS } from "./collections.mjs";

const PROJECT_ID = "yims-125a2";

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "ERROR: set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON path.\n" +
      "Example:\n" +
      "  GOOGLE_APPLICATION_CREDENTIALS=../misc/serviceaccount.json npm run export"
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
});
const db = admin.firestore();

const { Timestamp, GeoPoint } = admin.firestore;

/** Encode Firestore-native values into JSON-safe sentinels. */
function encode(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Timestamp) {
    return { __t: "timestamp", seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (value instanceof GeoPoint) {
    return { __t: "geopoint", latitude: value.latitude, longitude: value.longitude };
  }
  // DocumentReference
  if (value && typeof value === "object" && typeof value.path === "string" && value.firestore) {
    return { __t: "ref", path: value.path };
  }
  if (Array.isArray(value)) return value.map(encode);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = encode(v);
    return out;
  }
  return value;
}

// Many paths go through parent docs that were never created, e.g. the
// `seasons` in matches/seasons/{year}/{id}. Firestore keeps their
// subcollections, but `collection.get()` does not return them. listDocuments()
// does, so each collection is walked via listDocuments() + one get() for the
// docs that actually exist. Without this, matches, colleges, tournaments and
// score reports are silently skipped.

/** Caps concurrent Firestore requests (wraps calls, not the recursion). */
const MAX_IN_FLIGHT = 32;
let inFlight = 0;
const waiting = [];
async function limited(fn) {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise((r) => waiting.push(r));
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}

const stats = { docs: 0, placeholders: 0, collections: 0 };

/** Export every doc in a collection (including placeholder parents) recursively. */
async function exportCollection(colRef, dump) {
  stats.collections++;
  const [snap, refs] = await Promise.all([
    limited(() => colRef.get()),
    limited(() => colRef.listDocuments()),
  ]);
  const existing = new Map(snap.docs.map((d) => [d.id, d]));
  await Promise.all(
    refs.map(async (ref) => {
      const docSnap = existing.get(ref.id);
      if (docSnap) {
        dump[ref.path] = encode(docSnap.data());
        stats.docs++;
      } else {
        stats.placeholders++;
      }
      const subs = await limited(() => ref.listCollections());
      await Promise.all(subs.map((sub) => exportCollection(sub, dump)));
    })
  );
}

async function main() {
  const dump = {};
  const started = Date.now();
  const progress = setInterval(() => {
    const secs = Math.round((Date.now() - started) / 1000);
    console.log(
      `  ... ${secs}s: ${stats.docs} docs, ${stats.placeholders} placeholder parents, ` +
        `${stats.collections} collections, ${inFlight} requests in flight`
    );
  }, 5000);

  const topLevel = (await db.listCollections()).map((c) => c.id);
  const skipped = topLevel.filter(
    (id) => !SEED_COLLECTIONS.includes(id) && !EXCLUDED_COLLECTIONS.includes(id)
  );
  if (skipped.length) {
    console.log(`Top-level collections NOT exported (not in collections.mjs): ${skipped.join(", ")}`);
  }

  for (const name of SEED_COLLECTIONS) {
    const before = stats.docs;
    await exportCollection(db.collection(name), dump);
    console.log(`  ${name}: ${stats.docs - before} docs (including subcollections)`);
  }
  clearInterval(progress);
  await mkdir(new URL("./data/", import.meta.url), { recursive: true });
  const outPath = new URL("./data/prod-dump.json", import.meta.url);
  await writeFile(outPath, JSON.stringify(dump, null, 2));
  console.log(`\nWrote ${Object.keys(dump).length} documents to data/prod-dump.json in ${Math.round((Date.now() - started) / 1000)}s`);
  console.log("NEXT: npm run sanitize  (this file contains real PII — do not commit)");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
