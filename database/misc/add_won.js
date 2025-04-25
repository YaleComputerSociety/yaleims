// add_won_to_betArray.ts  ──────────────────────────────────────
//   npm i firebase
//   node add_won_to_betArray.js
//----------------------------------------------------------------

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  writeBatch,
  doc,
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

// ── batch size to stay under the 500-write limit ──────────────
const BATCH_LIMIT = 450;

async function addWonFieldToBetArray() {
  const usersSnap = await getDocs(collection(db, "users"));
  if (usersSnap.empty) {
    console.log("No users found – nothing to update.");
    return;
  }

  let batch   = writeBatch(db);
  let opCount = 0;

  for (const userDoc of usersSnap.docs) {
    const betsSnap = await getDocs(collection(userDoc.ref, "bets"));

    for (const betDoc of betsSnap.docs) {
      // ── fetch every sub-bet in betArray ─────────────────────
      const betArraySnap = await getDocs(collection(betDoc.ref, "betArray"));

      for (const subBetDoc of betArraySnap.docs) {
        const subBet    = subBetDoc.data();        // expects matchId & betOption
        const matchId   = subBet.matchId;
        const betOption = subBet.betOption;

        if (!matchId || !betOption) continue;      // skip incomplete sub-bets

        // ── get the corresponding match ──────────────────────
        const matchRef  = doc(db, "matches", matchId);
        const matchSnap = await getDoc(matchRef);
        if (!matchSnap.exists()) continue;

        const match = matchSnap.data();
        let   won;

        if (match?.winner == null || match.winner === "") {
          won = null;                              // match undecided
        } else {
          won = match.winner === betOption;        // true / false
        }

        // ── write the won field on the sub-bet doc ───────────
        batch.update(subBetDoc.ref, { won });
        opCount++;

        if (opCount >= BATCH_LIMIT) {
          await batch.commit();
          console.log("Committed", opCount, "writes");
          batch   = writeBatch(db);
          opCount = 0;
        }
      }
    }
  }

  // commit any remaining writes
  if (opCount > 0) {
    await batch.commit();
    console.log("Committed final", opCount, "writes");
  }

  console.log("🎉  All betArray documents now have a 'won' field");
}

addWonFieldToBetArray().catch((err) => {
  console.error(err);
  process.exit(1);
});
