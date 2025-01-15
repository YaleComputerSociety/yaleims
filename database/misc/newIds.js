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

// Function to delete broomball matches and reassign IDs
async function deleteBroomballAndReassignIds() {
  const matchesRef = collection(firestore, "matches");
  const snapshot = await getDocs(matchesRef);

  if (snapshot.empty) {
    console.log("No matches found to process.");
    return;
  }

  console.log(`Found ${snapshot.size} matches. Processing updates...`);

  let autoIncrementId = 1; // Start auto-incrementing from 1
  const batch = writeBatch(firestore);

  snapshot.forEach((docSnapshot) => {
    const matchData = docSnapshot.data();

    // If the sport is "Broomball", delete the document
    if (matchData.sport === "Broomball") {
      batch.delete(docSnapshot.ref);
      console.log(`Deleted broomball match with ID: ${docSnapshot.id}`);
    } else {
      // Assign new auto-incremented ID for other matches
      const newId = autoIncrementId.toString(); // Convert to string for Firestore document ID

      // Add the "id" field and update the document
      const newMatchData = { ...matchData, id: autoIncrementId };
      const newDocRef = doc(collection(firestore, "matches"), newId);

      batch.set(newDocRef, newMatchData); // Create a new document with the new ID
      batch.delete(docSnapshot.ref); // Delete the old document

      console.log(`Reassigned match ID from ${docSnapshot.id} to ${newId}`);
      autoIncrementId++;
    }
  });

  try {
    await batch.commit();
    console.log("Broomball matches deleted and IDs reassigned successfully.");
  } catch (error) {
    console.error("Error processing matches:", error);
  }
}

// Call the function to delete broomball matches and reassign IDs
deleteBroomballAndReassignIds();
