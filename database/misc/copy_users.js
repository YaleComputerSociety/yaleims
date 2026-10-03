import { firestore } from './firebase.js';
import {
  collection,
  getDocs,
  doc,
  setDoc
} from 'firebase/firestore';

async function copyUsers(sourceCol = 'users', targetCol = 'users_copy', concurrency = 5) {
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
        console.log('Done copying users');
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
    console.log(`Copied ${userId}`);
  }
}

copyUsers();
