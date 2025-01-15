import { firestore } from "./firebase.js";
import { doc, getDocs, setDoc, collection } from "firebase/firestore";

// Function to create a backup of the matches collection
const backupMatchesCollection = async () => {
  const matchesRef = collection(firestore, "matches");
  const backupRef = collection(firestore, "matches_backup");
  const snapshot = await getDocs(matchesRef);

  for (const docSnap of snapshot.docs) {
    const matchData = docSnap.data();
    const matchId = docSnap.id;

    const backupDocRef = doc(backupRef, matchId);
    await setDoc(backupDocRef, matchData);

    console.log(`Backed up match ${matchId}`);
  }

  console.log("Backup of matches collection complete!");
};

// Execute the backup
backupMatchesCollection().catch((err) => {
  console.error("Error backing up matches collection:", err);
});
