import { initializeApp, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';


// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB4ja4JXughIwxLPEt42mNClHH53sN0D6Q",
    authDomain: "yims-125a2.firebaseapp.com",
    projectId: "yims-125a2",
    storageBucket: "yims-125a2.appspot.com",
    messagingSenderId: "846558223250",
    appId: "1:846558223250:web:38c418708cc6f04e003f4b"
  };
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const firestore = getFirestore(app);

export { firestore };
