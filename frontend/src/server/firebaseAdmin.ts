// Server-only Firestore access with the Firebase Admin SDK.
//
// Data modules and Node maintenance/test entry points import this; application
// services go through the data modules. Authorization happens in the route
// because this client bypasses security rules.
//
// Credentials: on App Hosting the backend's service account
// (firebase-app-hosting-compute@) is picked up automatically. Locally, run
// `gcloud auth application-default login`, or use the emulator: with
// NEXT_PUBLIC_USE_EMULATOR=true (npm run dev:emulator) the Admin SDK is pointed
// at the local Firestore emulator and needs no credentials.
import "server-only";
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

function configuredFirestore(): Firestore {
  const db = getFirestore(adminApp);
  const noStreamReplay = { retry_codes_name: "no_stream_replay" };
  db.settings({
    // Firestore owns transaction retries and query resumption. Legacy GAX
    // stream retries can replay an aborted transaction ID; transport retries
    // after partial query results can also duplicate documents.
    gaxServerStreamingRetries: true,
    clientConfig: {
      interfaces: {
        "google.firestore.v1.Firestore": {
          retry_codes: { no_stream_replay: [] },
          methods: {
            BatchGetDocuments: noStreamReplay,
            RunQuery: noStreamReplay,
            RunAggregationQuery: noStreamReplay,
          },
        },
      },
    },
  });
  return db;
}

// Next can reload this module during development. Settings must be applied
// before the first request, so keep the configured client across reloads.
// Restart the dev server when changing client initialization settings.
const clients = globalThis as typeof globalThis & { yimsAdminDb?: Firestore };
export const adminDb: Firestore = clients.yimsAdminDb ??= configuredFirestore();
