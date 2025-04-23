import { firestore } from "./firebase.js"; // Ensure your Firestore instance is exported from firebase.js
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const fixMatchTypes = async () => {
  try {
    const matchesCollectionRef = collection(firestore, "matches");
    const matchDocs = await getDocs(matchesCollectionRef);

    for (const docSnapshot of matchDocs.docs) {
      const matchData = docSnapshot.data();
      const docId = docSnapshot.id;

      // Check and modify the 'type' field if it ends with 's'
      if (
        matchData.type &&
        typeof matchData.type === "string" &&
        matchData.type.endsWith("s")
      ) {
        const newType = matchData.type.slice(0, -1); // Remove last 's'
        const matchDocRef = doc(firestore, "matches", docId);

        await updateDoc(matchDocRef, { type: newType });

        console.log(
          `Updated match ${docId}: type changed from '${matchData.type}' to '${newType}'`
        );
      }
    }

    console.log("Finished updating match types.");
  } catch (error) {
    console.error("Error updating match types:", error);
  }
};

// Run the function
fixMatchTypes();
