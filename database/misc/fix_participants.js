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

const toCollegeName = {
  BF: "Benjamin Franklin",
  BK: "Berkeley",
  BR: "Branford",
  DC: "Davenport",
  ES: "Ezra Stiles",
  GH: "Grace Hopper",
  JE: "Jonathan Edwards",
  MC: "Morse",
  MY: "Pauli Murray",
  PC: "Pierson",
  SY: "Saybrook",
  SM: "Silliman",
  TD: "Timothy Dwight",
  TC: "Trumbull",
  "Benjamin Franklin": "Benjamin Franklin",
  Berkeley: "Berkeley",
  Branford: "Branford",
  Davenport: "Davenport",
  "Ezra Stiles": "Ezra Stiles",
  "Grace Hopper": "Grace Hopper",
  "Jonathan Edwards": "Jonathan Edwards",
  Morse: "Morse",
  "Pauli Murray": "Pauli Murray",
  Pierson: "Pierson",
  Saybrook: "Saybrook",
  Silliman: "Silliman",
  "Timothy Dwight": "Timothy Dwight",
  Trumbull: "Trumbull",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function rebuildParticipants() {
  const matchesCollection = collection(firestore, "matches");
  const usersCollection = collection(firestore, "users");

  const matchesSnapshot = await getDocs(matchesCollection);
  const usersSnapshot = await getDocs(usersCollection);

  const userDataMap = {};
  usersSnapshot.forEach((userDoc) => {
    const userData = userDoc.data();
    userDataMap[userData.email] = userData; // Map users by email
  });

  // Create a batch for efficient Firestore updates
  const batch = writeBatch(firestore);

  // Load all existing matches and append participants
  const matchUpdates = {}; // Temporary storage for appending participants

  matchesSnapshot.forEach((matchDoc) => {
    const matchData = matchDoc.data();

    // Ensure arrays exist for appending participants
    matchUpdates[matchDoc.id] = {
      away_college_participants: matchData.away_college_participants || [],
      home_college_participants: matchData.home_college_participants || [],
    };
  });

  // Iterate over users to populate participants for each match
  Object.values(userDataMap).forEach((user) => {
    if (Array.isArray(user.matches)) {
      user.matches.forEach((userMatch) => {
        const matchId = userMatch.matchId;
        const participantData = {
          college: user.college,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          points: user.points,
          role: user.role,
          username: user.username,
        };

        if (matchUpdates[matchId]) {
          const matchData = matchesSnapshot.docs
            .find((doc) => doc.id == matchId)
            ?.data();
          const awayCollege = matchData.away_college;
          const homeCollege = matchData.home_college;

          if (
            toCollegeName[participantData.college] ===
            toCollegeName[awayCollege]
          ) {
            matchUpdates[matchId].away_college_participants.push(
              participantData
            );
          } else if (
            toCollegeName[participantData.college] ===
            toCollegeName[homeCollege]
          ) {
            matchUpdates[matchId].home_college_participants.push(
              participantData
            );
          }
        }
      });
    }
  });

  // Apply updates to Firestore
  for (const [matchId, updatedData] of Object.entries(matchUpdates)) {
    batch.update(doc(firestore, "matches", matchId), updatedData);
  }

  await batch.commit();
  console.log("Participants appended and updated successfully.");
}

rebuildParticipants().catch((error) => {
  console.error("Error rebuilding participant data:", error);
});
