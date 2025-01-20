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

// Function to add "correctPredictions" attribute to all user documents
async function addCorrectPredictionsToUsers() {
  const usersRef = collection(firestore, "users");
  const snapshot = await getDocs(usersRef);

  if (snapshot.empty) {
    console.log("No user documents found.");
    return;
  }

  console.log(
    `Found ${snapshot.size} user documents. Adding 'correctPredictions' attribute...`
  );

  const batch = writeBatch(firestore);

  snapshot.docs.forEach((docSnapshot) => {
    const userId = docSnapshot.id;
    const userRef = doc(usersRef, userId);

    // Add "correctPredictions" attribute with an initial value of 0
    batch.update(userRef, { correctPredictions: 0 });
  });

  try {
    await batch.commit();
    console.log(
      "Successfully added 'correctPredictions' attribute to all user documents."
    );
  } catch (error) {
    console.error("Error adding 'correctPredictions' attribute:", error);
  }
}

// Call the function
addCorrectPredictionsToUsers();
