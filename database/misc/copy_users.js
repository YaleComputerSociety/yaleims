import { firestore } from './firebase.js';
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  setDoc
} from 'firebase/firestore';

async function copyUsersWithBets(sourceCol = 'users', targetCol = 'users_copy', concurrency = 5) {
  const srcColRef = collection(firestore, sourceCol);
  const usersSnap = await getDocs(srcColRef);
  const userDocs = usersSnap.docs;
  console.log(`Found ${userDocs.length} user docs`);

  // simple concurrency limiter
  let active = 0;
  let index = 0;

  return new Promise((resolve, reject) => {
    const next = () => {
      if (index >= userDocs.length && active === 0) {
        console.log('Done copying users + bets');
        resolve();
        return;
      }
      while (active < concurrency && index < userDocs.length) {
        const docSnap = userDocs[index++];
        active++;
        handleUser(docSnap)
          .then(() => { active--; next(); })
          .catch(e => { active--; console.error(e); next(); });
      }
    };
    next();
  });

  async function handleUser(userDocSnap) {
    const userId = userDocSnap.id;
    const data = userDocSnap.data();

    // Copy user doc
    await setDoc(doc(firestore, targetCol, userId), data);

    // Copy bets
    const betsSrc = collection(firestore, sourceCol, userId, 'bets');
    const betsSnap = await getDocs(betsSrc);
    if (betsSnap.empty) {
      console.log(`Copied ${userId} (no bets)`);
      return;
    }

    let batch = writeBatch(firestore);
    let ops = 0;

    for (const bet of betsSnap.docs) {
      const targetBetRef = doc(firestore, targetCol, userId, 'bets', bet.id);
      batch.set(targetBetRef, bet.data());
      ops++;
      if (ops === 450) { // flush before 500 limit
        await batch.commit();
        batch = writeBatch(firestore);
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
    console.log(`Copied ${userId} + ${betsSnap.size} bets`);
  }
}

copyUsersWithBets();
