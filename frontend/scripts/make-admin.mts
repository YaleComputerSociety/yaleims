// Gives a user of the LOCAL Firestore emulator the admin and dev roles, so you
// can use the admin pages after signing in locally as yourself (Yale CAS on
// :3000 creates your account in the emulator with no roles). The next page
// load picks them up: roles are read from Firestore on each request.
// (Seeded people need none of this: dev@example.edu is already an admin, and
// `npm run dev:token` signs in as anyone.)
//
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run make-admin -- <email>
//
// Refuses to run unless FIRESTORE_EMULATOR_HOST is set: it can never change
// roles in production.
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROLES = ["admin", "dev"];

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("Refusing to run: FIRESTORE_EMULATOR_HOST is not set (this script only writes to the emulator).");
  process.exit(1);
}
const email = process.argv[2];
if (!email?.includes("@")) {
  console.error("Usage: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run make-admin -- <email>");
  process.exit(1);
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-yims";
const db = getFirestore(getApps()[0] ?? initializeApp({ projectId }));
const ref = db.doc(`users/${email}`);
const snap = await ref.get();
if (!snap.exists) {
  console.error(`No user ${email} in the emulator. Sign in locally once (that creates the account), then run this again.`);
  process.exit(1);
}
const current: string[] = Array.isArray(snap.data()?.roles) ? snap.data()!.roles : [];
const roles = [...new Set([...current, ...ROLES])];
await ref.update({ roles });
console.log(`${email}: roles ${JSON.stringify(current)} → ${JSON.stringify(roles)}. Reload the page.`);
