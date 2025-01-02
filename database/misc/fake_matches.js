import { firestore } from './firebase.js';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

// Calculate the date for Sunday (two days from today)
const today = new Date();
const sunday = new Date(today);
sunday.setDate(today.getDate() + (7 - today.getDay()) % 7 + 2); // Move to Sunday

// Fake matches array
const fake_matches = [
  {
    forfeit: false,
    home_college: "BF",
    away_college: "BK",
    home_college_participants: [],
    away_college_participants: [],
    home_college_score: null,
    away_college_score: null,
    location: "test",
    sport: "Table Tennis",
    timestamp: new Date(sunday.setHours(10, 0, 0, 0)), // Sunday at 10:00 AM UTC
    winner: null,
  },
  {
    forfeit: false,
    home_college: "JE",
    away_college: "TD",
    home_college_participants: [],
    away_college_participants: [],
    home_college_score: null,
    away_college_score: null,
    location: "test",
    sport: "Soccer",
    timestamp: new Date(sunday.setHours(13, 0, 0, 0)), // Sunday at 1:00 PM UTC
    winner: null,
  },
  {
    forfeit: false,
    home_college: "SY",
    away_college: "DC",
    home_college_participants: [],
    away_college_participants: [],
    home_college_score: null,
    away_college_score: null,
    location: "test",
    sport: "Cornhole",
    timestamp: new Date(sunday.setHours(16, 0, 0, 0)), // Sunday at 4:00 PM UTC
    winner: null,
  },
  {
    forfeit: false,
    home_college: "GH",
    away_college: "JE",
    home_college_participants: [],
    away_college_participants: [],
    home_college_score: null,
    away_college_score: null,
    location: "test",
    sport: "Table Tennis",
    timestamp: new Date(sunday.setHours(18, 0, 0, 0)), // Sunday at 6:00 PM UTC
    winner: null,
  },
  {
    forfeit: false,
    home_college: "BF",
    away_college: "BK",
    home_college_participants: [],
    away_college_participants: [],
    home_college_score: null,
    away_college_score: null,
    location: "test",
    sport: "Table Tennis",
    timestamp: new Date(sunday.setHours(20, 0, 0, 0)), // Sunday at 8:00 PM UTC
    winner: null,
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
