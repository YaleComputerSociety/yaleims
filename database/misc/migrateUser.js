import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  setDoc
} from "firebase/firestore";

// -------- EDIT THIS ONLY ----------
const seasonId = "2024-2025";
const usersCollection = "users";
// Optionally limit to a subset of users (leave null for all)
const userAllowList = null; // e.g. ["alice@example.com", "bob@example.com"];
// ----------------------------------

function nowIso() { return new Date().toISOString(); }

/**
 * Optionally filter which user fields you copy into the season snapshot.
 * Return the object you want stored at users/{uid}/seasons/{seasonId}.
 */
function buildSeasonSnapshot(userData) {
  // If you want to exclude huge fields, do it here.
  return {
    ...userData
  };
}

async function migrate() {
  const usersSnap = await getDocs(collection(db, usersCollection));
  if (usersSnap.empty) {
    console.log("No users found.");
    return;
  }

  let usersProcessed = 0;
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;

    if (userAllowList && !userAllowList.includes(userId)) continue;

    const userData = userDoc.data();
    usersProcessed++;

    // 1. Write season snapshot document
    const seasonDocRef = doc(db, `${usersCollection}/${userId}/seasons/${seasonId}`);
    await setDoc(seasonDocRef, buildSeasonSnapshot(userData), { merge: true });

    // 2. Copy bets subcollection (if exists)
    const betsSrcRef = collection(db, `${usersCollection}/${userId}/bets`);
    const betsSnap = await getDocs(betsSrcRef);

    if (betsSnap.empty) {
      console.log(`[${userId}] No bets to copy (snapshot doc written).`);
      continue;
    }

    // Get existing season bets to avoid overwrites (Lite has no getDoc in bulk; we just overwrite safely OR
    // you can prefetch target bets if needed. Overwriting with same data is fine.)
    let betCopied = 0;
    for (const betDoc of betsSnap.docs) {
      const betId = betDoc.id;
      const seasonBetRef = doc(db, `${usersCollection}/${userId}/seasons/${seasonId}/bets/${betId}`);
      await setDoc(seasonBetRef, { ...betDoc.data(), seasonId }, { merge: false });
      betCopied++;
    }
    console.log(`[${userId}] Snapshot stored. Bets copied: ${betCopied}`);
  }

  console.log(`Finished. Users processed: ${usersProcessed}`);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
