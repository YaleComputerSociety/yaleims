import { firestore } from './firebase.js';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

// Calculate the date for Sunday (two days from today)
const today = new Date();
const sunday = new Date(today);
sunday.setDate(today.getDate() + (7 - today.getDay()) % 7 + 2); // Move to Sunday

// Fake matches array
const fake_matches = [
  {
    home_college: "BF",
    away_college: "BK",
    sport: "Table Tennis",
    home_college_score: null,
    away_college_score: null,
    winner: null,
    timestamp: new Date(sunday.setHours(10, 0, 0, 0)), // Sunday at 10:00 AM UTC
  },
  {
    home_college: "ES",
    away_college: "MC",
    sport: "Cornhole",
    home_college_score: null,
    away_college_score: null,
    winner: null,
    timestamp: new Date(sunday.setHours(13, 0, 0, 0)), // Sunday at 1:00 PM UTC
  },
  {
    home_college: "TD",
    away_college: "DC",
    sport: "Pickleball",
    home_college_score: null,
    away_college_score: null,
    winner: null,
    timestamp: new Date(sunday.setHours(16, 0, 0, 0)), // Sunday at 4:00 PM UTC
  },
  {
    home_college: "PC",
    away_college: "SY",
    sport: "Flag Football",
    home_college_score: null,
    away_college_score: null,
    winner: null,
    timestamp: new Date(sunday.setHours(18, 0, 0, 0)), // Sunday at 6:00 PM UTC
  },
  {
    home_college: "GH",
    away_college: "MY",
    sport: "Cornhole",
    home_college_score: null,
    away_college_score: null,
    winner: null,
    timestamp: new Date(sunday.setHours(20, 0, 0, 0)), // Sunday at 8:00 PM UTC
  },
];

const addFakeMatchesToFirestore = async () => {
  try {
    const matchesCollection = collection(firestore, 'matches');

    for (const match of fake_matches) {
      // Generate a custom document ID
      const docId = `${match.home_college}-${match.away_college}-${match.timestamp.toISOString()}`;
      const matchDocRef = doc(matchesCollection, docId);

      // Add the match with the custom document ID, converting the timestamp
      await setDoc(matchDocRef, {
        ...match,
        timestamp: Timestamp.fromDate(match.timestamp), // Convert to Firestore Timestamp
      });
      console.log(`Added match: ${docId}`);
    }

    console.log('All matches added successfully.');
  } catch (error) {
    console.error('Error adding fake matches to Firestore:', error);
  }
};

// Run the function to add matches
addFakeMatchesToFirestore();
