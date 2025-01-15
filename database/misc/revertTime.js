import { firestore } from "./firebase.js";
import {
  getDocs,
  collection,
  setDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

const revertMatchesCollection = async () => {
  const matchesRef = collection(firestore, "matches");
  const backupRef = collection(firestore, "matches_backup");

  try {
    // Fetch all documents from the backup collection
    const backupSnapshot = await getDocs(backupRef);
    const matchesSnapshot = await getDocs(matchesRef);

    console.log(`Clearing current matches collection...`);

    // Delete all current documents in the matches collection
    for (const docSnap of matchesSnapshot.docs) {
      await deleteDoc(doc(firestore, "matches", docSnap.id));
      console.log(`Deleted match: ${docSnap.id}`);
    }

    console.log(`Restoring matches from backup...`);

    // Restore matches from the backup collection
    for (const docSnap of backupSnapshot.docs) {
      const backupData = docSnap.data();
      const matchId = docSnap.id;

      await setDoc(doc(firestore, "matches", matchId), backupData);
      console.log(`Restored match: ${matchId}`);
    }

    console.log(
      "Revert operation complete! Matches collection has been restored to backup."
    );
  } catch (error) {
    console.error("Error reverting matches collection:", error);
  }
};

// Execute the revert operation
revertMatchesCollection().catch((err) =>
  console.error("Unexpected error:", err)
);
