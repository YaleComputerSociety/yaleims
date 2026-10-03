// Server-only Firestore access with the Firebase Admin SDK.
//
// Use this from API routes / server code, never from client components. It
// bypasses security rules, so authorization must happen in the route first.
//
// Credentials: on App Hosting the backend's service account
// (firebase-app-hosting-compute@) is picked up automatically. Locally, run
// `gcloud auth application-default login`, or use the emulator: with
// NEXT_PUBLIC_USE_EMULATOR=true (npm run dev:emulator) the Admin SDK is pointed
// at the local Firestore emulator and needs no credentials.
import { getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

if (
  process.env.NEXT_PUBLIC_USE_EMULATOR === "true" &&
  !process.env.FIRESTORE_EMULATOR_HOST
) {
  const host = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1";
  const port = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT ?? "8080";
  process.env.FIRESTORE_EMULATOR_HOST = `${host}:${port}`;
}

const adminApp: App =
  getApps()[0] ??
  initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });

export const adminDb: Firestore = getFirestore(adminApp);
