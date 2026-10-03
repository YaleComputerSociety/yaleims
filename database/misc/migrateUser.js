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
  // If you want to exclude huge fields, do it here. Betting fields are never copied.
  const { points, TotalPoints, correctPredictions, totalCorrectPredictions, totalPoints, ...rest } = userData;
  return rest;
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
    console.log(`[${userId}] Snapshot stored.`);
  }

  console.log(`Finished. Users processed: ${usersProcessed}`);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
