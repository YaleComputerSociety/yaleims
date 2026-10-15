import { initializeApp, getApps, FirebaseApp } from "firebase/app";

// Extend the Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, 
};

// ─── Core services ────────────────────────────────────────────
export const firebaseApp: FirebaseApp =
  getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(firebaseApp);

// ─── Emulator wiring (local dev/QA only) ──────────────────────
// When NEXT_PUBLIC_USE_EMULATOR === "true", point the client Firestore SDK at
// the local Firestore emulator instead of production (src/server/firebaseAdmin.ts
// does the same for the server). Guarded by a module-level flag to survive
// Next.js HMR.
let emulatorConnected = false;
if (
  process.env.NEXT_PUBLIC_USE_EMULATOR === "true" &&
  !emulatorConnected
) {
  const host = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1";
  const port = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT ?? "8080");
  connectFirestoreEmulator(db, host, port);
  emulatorConnected = true;
}

// ─── Lazy analytics init ──────────────────────────────────────
let analyticsInstance: Analytics | null = null;
let analyticsPromise: Promise<Analytics | null> | null = null;

export function initAnalytics() {
  if (analyticsPromise) return analyticsPromise;         // already started
  if (typeof window === "undefined") {
    analyticsPromise = Promise.resolve(null);            // SSR → no-op
    return analyticsPromise;
  }

  analyticsPromise = isSupported().then((supported) => {
    if (!supported) {
      console.warn("Firebase Analytics not supported in this environment");
      return null;
    }

    analyticsInstance = getAnalytics(firebaseApp);

    // Optional: customise gtag before first event
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments as any);
      };

    window.gtag("config", process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!, {
      send_page_view: false,                             // SPA manual tracking
      // cookie_flags: "SameSite=None;Secure",           // usually not needed
    });

    return analyticsInstance;
  });

  return analyticsPromise;
}
