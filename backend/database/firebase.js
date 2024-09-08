// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, setLogLevel } from 'firebase/firestore';
import {doc, setDoc } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAIcYRxDoAVuu8XbIzVWu6zrYAIPLqYcz4",
  authDomain: "yims-418714.firebaseapp.com",
  projectId: "yims-418714",
  storageBucket: "yims-418714.appspot.com",
  messagingSenderId: "683055403263",
  appId: "1:683055403263:web:f20cb2559898b09d883cca",
  measurementId: "G-Z69VL9PGYW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const firestore = getFirestore(app);

// Enable Firestore debug logging
setLogLevel('debug');
 
};

testFirestoreConnection();

export {app, firestore}