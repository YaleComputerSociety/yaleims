import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

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

// Function to fix timestamps and match IDs
async function fixTimestampsAndMatchIds() {
  const matchesRef = collection(firestore, "matches_backup");
  const snapshot = await getDocs(matchesRef);

  if (snapshot.empty) {
    console.log("No matches found to update.");
    return;
  }

  console.log(`Found ${snapshot.size} matches. Processing updates...`);

  snapshot.forEach(async (docSnapshot) => {
    const matchData = docSnapshot.data();
    let { timestamp } = matchData;

    // Ensure timestamp is a Firestore Timestamp
    if (!(timestamp instanceof Timestamp)) {
      timestamp = Timestamp.fromDate(new Date(timestamp));
    }

    // Construct the correct match ID
    const matchId = `${matchData.home_college}-${
      matchData.away_college
    }-${timestamp.toDate().toISOString()}`;

    // Update the document with the correct ID and timestamp
    try {
      const docRef = doc(collection(firestore, "matches"), docSnapshot.id);
      await updateDoc(docRef, { timestamp });

      console.log(`Updated match: ${docSnapshot.id} -> ${matchId}`);
    } catch (error) {
      console.error(`Error updating match ${docSnapshot.id}:`, error);
    }
  });

  console.log("Finished updating matches.");
}

// Call the function to fix timestamps and match IDs
fixTimestampsAndMatchIds();
