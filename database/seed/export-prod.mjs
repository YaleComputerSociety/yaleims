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
import { SEED_COLLECTIONS } from "./collections.mjs";

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

/** Recursively export a document and its subcollections into `dump`. */
async function exportDoc(docSnap, dump) {
  dump[docSnap.ref.path] = encode(docSnap.data());
  const subcollections = await docSnap.ref.listCollections();
  for (const sub of subcollections) {
    const subSnap = await sub.get();
    for (const d of subSnap.docs) await exportDoc(d, dump);
  }
}

async function main() {
  const dump = {};
  for (const name of SEED_COLLECTIONS) {
    const snap = await db.collection(name).get();
    console.log(`  ${name}: ${snap.size} docs`);
    for (const d of snap.docs) await exportDoc(d, dump);
  }
  await mkdir(new URL("./data/", import.meta.url), { recursive: true });
  const outPath = new URL("./data/prod-dump.json", import.meta.url);
  await writeFile(outPath, JSON.stringify(dump, null, 2));
  console.log(`\nWrote ${Object.keys(dump).length} documents to data/prod-dump.json`);
  console.log("NEXT: npm run sanitize  (this file contains real PII — do not commit)");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
