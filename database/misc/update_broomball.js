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

// Function to update broomball documents
async function updateBroomballIds() {
  const matchesRef = collection(firestore, "matches");
  const snapshot = await getDocs(matchesRef);
  const batch = writeBatch(firestore);

  let autoIncrementId = 325; // Start auto-incremented ID

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();

    if (data.sport && data.sport.toLowerCase() === "broomball") {
      // Create a new document with the auto-incremented ID as the document ID
      const newDocRef = doc(firestore, "matches", autoIncrementId.toString());

      const updatedData = {
        ...data,
        id: autoIncrementId, // Ensure the `id` field matches the new document ID
      };

      // Set the new document
      batch.set(newDocRef, updatedData);

      // Delete the old document
      batch.delete(docSnapshot.ref);

      console.log(
        `Moved document ${docSnapshot.id} to new ID: ${autoIncrementId}`
      );
      autoIncrementId++;
    }
  });

  try {
    await batch.commit();
    console.log("All broomball IDs updated successfully.");
  } catch (error) {
    console.error("Error updating broomball IDs:", error);
  }
}

// Call the function
updateBroomballIds();
