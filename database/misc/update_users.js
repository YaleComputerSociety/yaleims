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

async function addPoints() {
  const usersRef = collection(firestore, "users");
  const snapshot = await getDocs(usersRef);

  if (snapshot.empty) {
    console.log("No user documents found.");
    return;
  }

  const batch = writeBatch(firestore);
  const pointsToAdd = 500; // Define the points to add

  snapshot.docs.forEach((docSnapshot) => {
    const userId = docSnapshot.id;
    const userRef = doc(firestore, "users", userId);

    // Update points for each user
    const currentPoints = docSnapshot.data().points || 0; // Default to 0 if undefined
    batch.update(userRef, { points: currentPoints + pointsToAdd });
  });

  try {
    await batch.commit();
    console.log("Successfully updated points for all user documents.");
  } catch (error) {
    console.error("Error updating points:", error);
  }
}

// Call the function
addPoints();
