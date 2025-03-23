import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import fs from "fs";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4ja4JXughIwxLPEt42mNClHH53sN0D6Q",
  authDomain: "yims-125a2.firebaseapp.com",
  projectId: "yims-125a2",
  storageBucket: "yims-125a2.appspot.com",
  messagingSenderId: "846558223250",
  appId: "1:846558223250:web:38c418708cc6f04e003f4b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function findLostBets() {
  console.log("Fetching users...");

  const usersRef = collection(firestore, "users");
  const usersSnapshot = await getDocs(usersRef);

  if (usersSnapshot.empty) {
    console.log("No users found.");
    return;
  }

  const lostBets = [];

  console.log(`Checking ${usersSnapshot.docs.length} users...`);

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    console.log(`Checking bets for user: ${userId}`);

    const betsRef = collection(firestore, `users/${userId}/bets`);
    const betsQuery = query(
      betsRef,
      where("matchId", ">=", "546"),
      where("matchId", "<=", "547")
    );

    const betsSnapshot = await getDocs(betsQuery);

    if (!betsSnapshot.empty) {
      betsSnapshot.forEach((betDoc) => {
        const betData = betDoc.data();
        console.log(
          `Found bet for match ${betData.matchId} from user ${userId}`
        );

        lostBets.push({
          userId,
          betId: betDoc.id,
          ...betData,
        });
      });
    }
  }

  if (lostBets.length === 0) {
    console.log("No bets found for match IDs 492-500.");
    return;
  }

  fs.writeFileSync("lost_bets.json", JSON.stringify(lostBets, null, 2));
  console.log(
    `✅ Found ${lostBets.length} bets. Results saved to lost_bets.json`
  );
}

// Run the function
findLostBets();
