import { firestore } from './firebase.js'; // Ensure your Firestore instance is exported from firebase.js
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

const copyCollection = async (sourceCollectionName, targetCollectionName) => {
  try {
    // Get the source collection
    const sourceCollectionRef = collection(firestore, sourceCollectionName);
    const sourceDocs = await getDocs(sourceCollectionRef);

    // Iterate through each document in the source collection
    for (const docSnapshot of sourceDocs.docs) {
      const docData = docSnapshot.data();
      const docId = docSnapshot.id;

      // Reference the target collection and create a document with the same ID
      const targetDocRef = doc(firestore, targetCollectionName, docId);
      await setDoc(targetDocRef, docData);

      console.log(`Document ${docId} copied to ${targetCollectionName}`);
    }

    console.log(`All documents from '${sourceCollectionName}' copied to '${targetCollectionName}'`);
  } catch (error) {
    console.error('Error copying collection:', error);
  }
};

// Replace with your collection names
const sourceCollectionName = 'users';
const targetCollectionName = 'users_copy';

// Execute the copy function
copyCollection(sourceCollectionName, targetCollectionName);
