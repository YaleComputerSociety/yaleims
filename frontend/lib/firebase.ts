import { initializeApp, getApps, FirebaseApp } from "firebase/app";

// Extend the Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}
import { getFirestore } from "firebase/firestore";
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
export const admin = getFirestore(firebaseApp)

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
