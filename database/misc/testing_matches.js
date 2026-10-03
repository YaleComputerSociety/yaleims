import { firestore } from "./firebase.js";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore";

// Calculate the date for Sunday (two days from today)
const today = new Date();
const sunday = new Date(today);
sunday.setDate(today.getDate() + ((7 - today.getDay()) % 7) + 2); // Move to Sunday

// Fake matches array
const fake_matches = [
  {
    away_college: "BR",
    away_college_participants: [], // Add participants here if needed
    away_college_score: null,
    forfeit: null,
    home_college: "GH",
    home_college_participants: [], // Add participants here if needed
    home_college_score: null,
    id: "00test3",
    location: "Lanman Center",
    location_extra: "Court 1",
    sport: "MHoops",
    timestamp: Timestamp.fromDate(new Date("2025-01-20T20:00:00-05:00")), // Use the client SDK Timestamp
    type: "Regular",
    winner: null, // Add winner if known
  },
];

const addFakeMatchesToFirestore = async () => {
  try {
    const matchesCollection = collection(firestore, "matches_testing");

    for (const match of fake_matches) {
      // Generate a custom document ID
      const docId = match.id;
      const matchDocRef = doc(matchesCollection, docId);

      // Add the match with the custom document ID, converting the timestamp
      await setDoc(matchDocRef, {
        ...match,
      });
      console.log(`Added match: ${docId}`);
    }

    console.log("All matches added successfully.");
  } catch (error) {
    console.error("Error adding fake matches to Firestore:", error);
  }
};

// Run the function to add matches
addFakeMatchesToFirestore();
