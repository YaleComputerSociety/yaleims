import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  deleteField,
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

// Function to update sport to "WHoops" for documents with ID >= 451
async function updateSportForWHoops() {
  try {
    console.log("Fetching matches with ID >= 451...");

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
      const data = doc.data();
      const docId = parseInt(doc.id, 10);

      // Check if the document ID is >= 451
      if (docId >= 451) {
        console.log(`Updating "sport" to "WHoops" for document ID: ${doc.id}`);
        batch.update(doc.ref, { sport: "WHoops" });
      }
    });

    // Commit the batch
    await batch.commit();
    console.log("All documents with ID >= 451 have been updated to WHoops");
  } catch (error) {
    console.error("Error updating sport field:", error);
  }
}

// Call the functions
updateSportForWHoops();
