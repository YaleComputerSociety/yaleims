import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK only if not already initialized
export const db = getFirestore(getApps()[0] ?? initializeApp());
