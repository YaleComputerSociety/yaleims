// add_betArray_seasons.js  ──────────────────────────────────────
//   npm i firebase          # if you haven’t already
//   node add_betArray_seasons.js

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
  limit,
} from 'firebase/firestore';

/* ── 1. Firebase config (same you already use) ──────────────── */
const firebaseConfig = {
  apiKey:            'AIzaSyB4ja4JXughIwxLPEt42mNClHH53sN0D6Q',
  authDomain:        'yims-125a2.firebaseapp.com',
  projectId:         'yims-125a2',
  storageBucket:     'yims-125a2.appspot.com',
  messagingSenderId: '846558223250',
  appId:             '1:846558223250:web:38c418708cc6f04e003f4b',
};

/* ── 2. Init ────────────────────────────────────────────────── */
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ── 3. Tunables ────────────────────────────────────────────── */
const defaultCashed   = 1;   // what to write if currentCashed missing
const writeBatchLimit = 450; // keep < 500 writes per batch

/* ── 4. Migration ───────────────────────────────────────────── */
async function migrate() {
  const usersSnap = await getDocs(collection(db, 'users'));
  if (usersSnap.empty) {
    console.log('No users found – nothing to migrate.');
    return;
  }

  let batch   = writeBatch(db);
  let opCount = 0;

  for (const userDoc of usersSnap.docs) {
    /* 4A. iterate every season under the user */
    const seasonsSnap = await getDocs(collection(userDoc.ref, 'seasons'));

    for (const seasonDoc of seasonsSnap.docs) {
      /* 4B. iterate every bet inside that season */
      const betsSnap = await getDocs(collection(seasonDoc.ref, 'bets'));

      for (const betDoc of betsSnap.docs) {
        /* 0️⃣: skip if betArray already exists */
        const betArrayQuery = query(
          collection(betDoc.ref, 'betArray'),
          limit(1)
        );
        const betArraySnap = await getDocs(betArrayQuery);
        if (!betArraySnap.empty) continue;           // already migrated

        const betData = betDoc.data();

        /* 1️⃣: add currentCashed if missing */
        if (betData.currentCashed === undefined) {
          batch.update(betDoc.ref, { currentCashed: defaultCashed });
          opCount++;
        }

        /* 2️⃣: copy the whole bet into betArray/{betId}            */
        const betArrayRef = doc(collection(betDoc.ref, 'betArray'), betDoc.id);
        batch.set(betArrayRef, betData);
        opCount++;

        /* 3️⃣: commit when near 500‑write limit                    */
        if (opCount >= writeBatchLimit) {
          await batch.commit();
          console.log(`Committed ${opCount} writes`);
          batch   = writeBatch(db);
          opCount = 0;
        }
      }
    }
  }

  /* 4️⃣: final flush */
  if (opCount > 0) {
    await batch.commit();
    console.log(`Committed final ${opCount} writes`);
  }

  console.log('🎉  Migration complete');
}

/* ── 5. Kick it off ─────────────────────────────────────────── */
migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
