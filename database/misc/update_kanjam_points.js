import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  where,
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function updateKanjamPoints() {
  // First, get all colleges to validate they exist
  const collegesRef = collection(firestore, "colleges");
  const collegesSnapshot = await getDocs(collegesRef);
  const validColleges = new Set(collegesSnapshot.docs.map((doc) => doc.id));

  console.log("Valid colleges:", Array.from(validColleges));

  const batch = writeBatch(firestore);

  // 2. Get all Kanjam matches
  const matchesRef = collection(firestore, "matches");
  const matchesQuery = query(matchesRef, where("sport", "==", "Kanjam"));
  const matchesSnapshot = await getDocs(matchesQuery);

  console.log(`Found ${matchesSnapshot.size} Kanjam matches`);

  // 3. Update college points for each scored match
  let updatedMatches = 0;
  for (const matchDoc of matchesSnapshot.docs) {
    const matchData = matchDoc.data();
    const { home_college, away_college, winner } = matchData;

    // Only process matches that have been scored
    if (winner) {
      console.log(`Processing match ${matchDoc.id}:`, matchData);

      // For each match, we need to add 1 point to the winner's total
      if (winner !== "Draw") {
        if (!validColleges.has(winner)) {
          console.log(
            `Warning: Winner college "${winner}" does not exist, skipping update`
          );
          continue;
        }
        const winnerRef = doc(firestore, "colleges", winner);
        batch.update(winnerRef, {
          points: increment(1),
        });
        console.log(`Added 1 point to ${winner}`);
        updatedMatches++;
      } else {
        // For draws, add 0.5 points to each team
        if (!validColleges.has(home_college)) {
          console.log(
            `Warning: Home college "${home_college}" does not exist, skipping update`
          );
          continue;
        }
        if (!validColleges.has(away_college)) {
          console.log(
            `Warning: Away college "${away_college}" does not exist, skipping update`
          );
          continue;
        }
        const homeRef = doc(firestore, "colleges", home_college);
        const awayRef = doc(firestore, "colleges", away_college);
        batch.update(homeRef, {
          points: increment(0.5),
        });
        batch.update(awayRef, {
          points: increment(0.5),
        });
        console.log(
          `Added 0.5 points each to ${home_college} and ${away_college}`
        );
        updatedMatches++;
      }
    }
  }

  console.log(`Updated ${updatedMatches} matches`);

  try {
    await batch.commit();
    console.log("Successfully committed all updates");
  } catch (error) {
    console.error("Error updating points:", error);
  }
}

// Call the function
updateKanjamPoints();
