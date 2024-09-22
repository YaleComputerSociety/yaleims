// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore"; // Import Firestore

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB4ja4JXughIwxLPEt42mNClHH53sN0D6Q",
  authDomain: "yims-125a2.firebaseapp.com",
  projectId: "yims-125a2",
  storageBucket: "yims-125a2.appspot.com",
  messagingSenderId: "846558223250",
  appId: "1:846558223250:web:ff5d718b60b2e6ed003f4b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app); // Initialize Firestore

export {firestore};

// // Function to add data
// async function addUserData(userId, name, email) {
//     try {
//       const docRef = await addDoc(collection(firestore, "users"), {
//         userId: userId,
//         username: name,
//         email: email
//       });
//       console.log("Document written with ID: ", docRef.id);
//     } catch (error) {
//       console.error("Error adding document: ", error);
//     }
//   }
  
//   // Call the function
//   addUserData("user1", "Anna Xu", "anna@example.com");