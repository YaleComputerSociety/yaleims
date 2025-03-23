import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  Timestamp,
  increment,
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

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Set a timestamp for February 20, 2025 (months are 0-indexed)
const feb20 = Timestamp.fromDate(new Date(2025, 1, 20));

const broomballByes = [{ team: "BF" }, { team: "BR" }];
// Each sport win is worth 5 points.
const winPoints = 6;

async function addByeMatches() {
  const batch = writeBatch(firestore);
  let autoIdCounter = 608; // Starting document ID for bye matches; adjust as needed

  // Helper function to process bye entries for a given sport
  const processByes = (byeArray, sportName) => {
    byeArray.forEach((bye) => {
      const matchId = autoIdCounter++;

      // Create a bye match document following your existing match structure
      const byeMatch = {
        home_college: bye.team,
        away_college: bye.team, // since it's a bye, both fields are the same
        sport: sportName,
        timestamp: feb20,
        type: "Bye",
        home_college_score: 0,
        away_college_score: 0,
        winner: bye.team,
        id: autoIdCounter,
      };

      // Add the bye match document to the "matches" collection
      const matchDocRef = doc(
        collection(firestore, "matches"),
        matchId.toString()
      );
      batch.set(matchDocRef, byeMatch);

      // Update the college document: mark as a win and increment games and points
      const collegeDocRef = doc(collection(firestore, "colleges"), bye.team);
      batch.update(collegeDocRef, {
        games: increment(1),
        wins: increment(1),
        points: increment(winPoints),
      });
    });
  };

  // Process each sport's bye entries
  processByes(broomballByes, "Broomball");

  try {
    await batch.commit();
    console.log(
      "Bye matches added as wins and college stats updated successfully."
    );
  } catch (error) {
    console.error("Error adding bye matches:", error);
  }
}

addByeMatches();
