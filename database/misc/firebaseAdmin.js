// Admin SDK access for the admin scripts in this folder.
//
// Production Firestore rules deny all writes from the browser SDK, so scripts
// that write must use this instead of ./firebase.js.
//
// Safety: if FIRESTORE_EMULATOR_HOST is set, everything goes to the local
// emulator. Otherwise the script refuses to run unless `--prod` is passed, so
// production is never written to by accident.
//
// Credentials for --prod: ./serviceaccount.json if present (gitignored), else
// Application Default Credentials (`gcloud auth application-default login`).
import { existsSync, readFileSync } from "fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT_ID = emulator ? (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-yims") : "yims-125a2";

if (!emulator && !process.argv.includes("--prod")) {
  console.error(
    "REFUSING TO RUN against PRODUCTION without --prod.\n" +
      "  Emulator:   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node <script> ...\n" +
      "  Production: node <script> ... --prod   (take a backup first)",
  );
  process.exit(1);
}

const keyPath = new URL("./serviceaccount.json", import.meta.url);
const app = initializeApp({
  projectId: PROJECT_ID,
  ...(!emulator && existsSync(keyPath)
    ? { credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) }
    : {}),
});

console.log(`Target: ${emulator ? `emulator at ${emulator}` : `PRODUCTION (${PROJECT_ID})`}`);

export const db = getFirestore(app);
export { FieldValue, Timestamp } from "firebase-admin/firestore";
