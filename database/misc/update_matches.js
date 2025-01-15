import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
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
async function addVolumeFields() {
  try {
    console.log("Fetching all matches...");

    // Reference to the matches collection
    const matchesRef = collection(firestore, "matches");
    const querySnapshot = await getDocs(matchesRef);

    if (querySnapshot.empty) {
      console.log("No matches found.");
      return;
    }

    // Create a batch to update documents
    const batch = writeBatch(firestore);

    querySnapshot.forEach((doc) => {
      console.log(`Adding volume fields to document ID: ${doc.id}`);

      batch.update(doc.ref, {
        home_volume: 0, // Default value for home_volume
        away_volume: 0, // Default value for away_volume
        draw_volume: 0, // Default value for draw_volume
        default_volume: 0, // Default value for default_volume
      });
    });

    // Commit the batch
    await batch.commit();
    console.log("All matches have been updated with new volume fields.");
  } catch (error) {
    console.error("Error adding volume fields:", error);
  }
}

// Call the function
addVolumeFields();
