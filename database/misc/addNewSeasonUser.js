import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore'
import { db } from "./firebase.js";

const seasonId = '2025-2026';

async function addSeasonToAllUsers() {
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log('Users found:', usersSnap.size);

  let batch = writeBatch(db);
  let ops = 0;
  let created = 0;

  for (const userDoc of usersSnap.docs) {
    const seasonRef = doc(collection(userDoc.ref, 'seasons'), seasonId);
    const seasonSnap = await getDoc(seasonRef);
    if (seasonSnap.exists()) {
      console.log('Skip (already exists):', userDoc.id);
      continue;
    }

    batch.set(seasonRef, {
      correctPredictions: 0,
      matches: [],
      points: 2000
    });
    ops++;
    created++;

    // Firestore batches max 500 writes
    if (ops === 500) {
      await batch.commit();
      console.log('Committed 500 season docs...');
      batch = writeBatch(db);
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  console.log(`Done. Created season ${seasonId} for ${created} user(s).`);
}
addSeasonToAllUsers()