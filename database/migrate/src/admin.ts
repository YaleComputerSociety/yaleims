// Admin SDK access, with the same guard as database/misc/firebaseAdmin.js:
// with FIRESTORE_EMULATOR_HOST set everything goes to the local emulator;
// otherwise the script refuses to run unless --prod is passed.
//
// Credentials for --prod: ../misc/serviceaccount.json if present (gitignored),
// else Application Default Credentials.
import { existsSync, readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "yims-125a2";
const emulator = process.env.FIRESTORE_EMULATOR_HOST;

if (!emulator && !process.argv.includes("--prod")) {
  console.error(
    "REFUSING TO RUN against PRODUCTION without --prod.\n" +
      "  Emulator:   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run migrate -- ...\n" +
      "  Production: npm run migrate -- ... --prod   (export a backup before --apply)"
  );
  process.exit(1);
}

const keyPath = new URL("../../misc/serviceaccount.json", import.meta.url);
initializeApp({
  projectId: PROJECT_ID,
  ...(!emulator && existsSync(keyPath)
    ? { credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) }
    : {}),
});

export const target = emulator ? `emulator at ${emulator}` : `PRODUCTION (${PROJECT_ID})`;
export const db = getFirestore();
