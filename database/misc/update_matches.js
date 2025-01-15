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

// Function to add new volume fields to all matches
// Function to update location for Flag Football matches
async function updateFlagFootballLocations() {
  const matchesRef = collection(firestore, "matches");
  const snapshot = await getDocs(matchesRef);

  if (snapshot.empty) {
    console.log("No matches found.");
    return;
  }

  console.log(
    `Found ${snapshot.size} matches. Updating locations for Flag Football games...`
  );

  const batch = writeBatch(firestore);

  snapshot.forEach((docSnapshot) => {
    const matchData = docSnapshot.data();

    if (matchData.sport === "Flag Football") {
      const matchRef = doc(matchesRef, docSnapshot.id);
      batch.update(matchRef, {
        location: "Yale Bowl",
        location_extra: "D South 1-3",
      });
      console.log(
        `Updated location for Flag Football match: ${docSnapshot.id}`
      );
    }
  });

  try {
    await batch.commit();
    console.log("Locations for Flag Football matches updated successfully.");
  } catch (error) {
    console.error("Error updating Flag Football match locations:", error);
  }
}

// Call the functions
updateFlagFootballLocations();
