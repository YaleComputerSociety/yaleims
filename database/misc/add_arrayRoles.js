// ensureUserRoleInMRoles.ts
// node ensureUserRoleInMRoles.ts

/** ✱ 1. FIREBASE SETUP ✱ */
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  arrayUnion,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4ja4JXughIwxLPEt42mNClHH53sN0D6Q",
  authDomain: "yims-125a2.firebaseapp.com",
  projectId: "yims-125a2",
  storageBucket: "yims-125a2.appspot.com",
  messagingSenderId: "846558223250",
  appId: "1:846558223250:web:38c418708cc6f04e003f4b",
};
initializeApp(firebaseConfig);
const db = getFirestore();

/** ✱ 2. MAIN PIPELINE ✱ */
async function ensureUserRole() {
  const usersCol = collection(db, "users");
  const usersSnap = await getDocs(usersCol);

  let processed = 0;
  let updated   = 0;
  let batch     = writeBatch(db);
  const BATCH_LIMIT = 500;           // Firestore batch cap

  for (const userDoc of usersSnap.docs) {
    processed++;

    const data     = userDoc.data();
    const mRoles   = Array.isArray(data.mRoles) ? data.mRoles : [];

    /* Already has "user" → skip */
    if (mRoles.includes("user")) continue;

    /* Otherwise add it (arrayUnion dedups automatically) */
    batch.update(userDoc.ref, { mRoles: arrayUnion("user") });
    updated++;

    /* Commit every 500 writes */
    if (updated % BATCH_LIMIT === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`✅ Committed ${updated} user updates so far…`);
    }
  }

  /* Commit trailing writes */
  if (updated % BATCH_LIMIT !== 0) await batch.commit();

  console.log(`🎉 Scanned ${processed} docs, updated ${updated}. Done!`);
}

ensureUserRole().catch(console.error);
