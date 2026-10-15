// make-admin.mjs
// ----------------------------------------------------------------------------
// Gives an existing user in the LOCAL Firestore emulator the admin and dev
// roles, so a developer can use the admin pages after signing in locally.
//
// The sanitized seed has no real emails, so your own account only exists in
// the emulator after your first local sign-in (Yale CAS creates it with the
// plain "user" role). Run this once after that. The next page load picks the
// roles up (/api/auth/verify reads them from Firestore); no new sign-in needed.
//
// SAFETY: refuses to run unless FIRESTORE_EMULATOR_HOST is set, so it can never
// change roles in production.
//
// Usage (with the emulator running):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run make-admin -- <email>
// ----------------------------------------------------------------------------
import admin from "firebase-admin";

const PROJECT_ID = "yims-125a2";
const ROLES = ["user", "admin", "dev"];

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "REFUSING TO RUN: FIRESTORE_EMULATOR_HOST is not set.\n" +
      "This guard prevents accidentally changing roles in production.\n" +
      "Start the emulator, then run:\n" +
      "  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run make-admin -- <email>"
  );
  process.exit(1);
}

const email = process.argv[2];
if (!email || !email.includes("@")) {
  console.error("Usage: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run make-admin -- <email>");
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const ref = admin.firestore().doc(`users/${email}`);

const snap = await ref.get();
if (!snap.exists) {
  console.error(
    `No user ${email} in the emulator. Sign in locally once (that creates the ` +
      "account), then run this again."
  );
  process.exit(1);
}

const current = Array.isArray(snap.data().mRoles) ? snap.data().mRoles : [];
const mRoles = [...new Set([...current, ...ROLES])];
await ref.update({ mRoles });
console.log(`${email}: mRoles ${JSON.stringify(current)} → ${JSON.stringify(mRoles)}`);
console.log("Reload the page; the Hub now shows the admin actions.");
