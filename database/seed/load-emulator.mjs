// load-emulator.mjs
// ----------------------------------------------------------------------------
// Loads data/seed.json into the LOCAL Firestore emulator.
//
// SAFETY: this script refuses to run unless FIRESTORE_EMULATOR_HOST is set, so
// it can never write seed data into production. The admin SDK automatically
// routes all writes to the emulator when that env var is present.
//
// Usage (with the emulator running):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run load
//
// For a faster repeatable workflow, after loading once, snapshot the emulator:
//   firebase emulators:export ./seed/snapshot --project yims-125a2
// then start future sessions with:
//   firebase emulators:start --import=./seed/snapshot
// ----------------------------------------------------------------------------
import admin from "firebase-admin";
import { readFile } from "node:fs/promises";

const PROJECT_ID = "yims-125a2";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "REFUSING TO RUN: FIRESTORE_EMULATOR_HOST is not set.\n" +
      "This guard prevents accidentally writing seed data to production.\n" +
      "Start the emulator, then run:\n" +
      "  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run load"
  );
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const { Timestamp, GeoPoint } = admin.firestore;

/** Rebuild Firestore-native types from the sentinels written by export-prod. */
function decode(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(decode);
  if (typeof value === "object") {
    switch (value.__t) {
      case "timestamp":
        return new Timestamp(value.seconds, value.nanoseconds);
      case "geopoint":
        return new GeoPoint(value.latitude, value.longitude);
      case "ref":
        return db.doc(value.path);
      default: {
        const out = {};
        for (const [k, v] of Object.entries(value)) out[k] = decode(v);
        return out;
      }
    }
  }
  return value;
}

async function main() {
  const seed = JSON.parse(
    await readFile(new URL("./data/seed.json", import.meta.url), "utf8")
  );
  const entries = Object.entries(seed);
  console.log(`Loading ${entries.length} docs into emulator at ${process.env.FIRESTORE_EMULATOR_HOST}...`);

  // Firestore batches cap at 500 writes.
  const CHUNK = 400;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const batch = db.batch();
    for (const [path, data] of entries.slice(i, i + CHUNK)) {
      batch.set(db.doc(path), decode(data));
    }
    await batch.commit();
    console.log(`  committed ${Math.min(i + CHUNK, entries.length)}/${entries.length}`);
  }
  console.log("Done. The emulator now holds the sanitized seed dataset.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
