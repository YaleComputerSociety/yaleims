// Initialize Firebase
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Get a Firestore instance
const db = admin.firestore();

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app); // Initialize Firestore

// Cloud Function to get the leaderboard data
exports.getLeaderboard = functions.https.onRequest(async (req, res) => {
    try {
      const leaderboardRef = admin.firestore().collection('colleges');
      const snapshot = await leaderboardRef.orderBy('points', 'desc').get();
  
      const colleges = [];
      snapshot.forEach(doc => {
        colleges.push({ id: doc.id, ...doc.data() });
      });
  
      res.status(200).json({ colleges });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).send("Error fetching leaderboard");
    }
  });
