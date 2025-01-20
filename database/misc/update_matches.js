import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
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

// Function to add a predictions map to all matches
async function addPredictionsMap() {
  const matchesRef = collection(firestore, "matches");
  const snapshot = await getDocs(matchesRef);

  if (snapshot.empty) {
    console.log("No matches found.");
    return;
  }

  console.log(`Found ${snapshot.size} matches. Adding predictions map...`);

  const batch = writeBatch(firestore);

  snapshot.forEach((docSnapshot) => {
    const matchData = docSnapshot.data();

    if (!matchData.predictions) {
      const matchRef = doc(matchesRef, docSnapshot.id);
      batch.update(matchRef, { predictions: {} });
      console.log(`Added predictions map to match: ${docSnapshot.id}`);
    }
  });

  try {
    await batch.commit();
    console.log("Predictions map added to all matches successfully.");
  } catch (error) {
    console.error("Error adding predictions map to matches:", error);
  }
}

// Call the function
addPredictionsMap();
