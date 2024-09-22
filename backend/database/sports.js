import { firestore } from './firebase.js'; // Import Firestore
import { collection, addDoc } from 'firebase/firestore'; // Firestore functions

// Define the sports data
export interface Sport {
    id: number;
    name: string;
    points: number;
    season: string;
    emoji: string;
}

export const sports: { [key: string]: Sport } = {
    "1": { id: 1, name: "Soccer", points: 11, season: "fall", emoji: "⚽" },
    "2": { id: 2, name: "Flag Football", points: 6, season: "fall", emoji: "🏈" },
    // Add all other sports...
};

// Function to add sports to Firestore
const addSportsToFirestore = async () => {
    const sportsCollectionRef = collection(firestore, 'sports'); // Reference to sports collection

    for (const key in sports) {
        const sport = sports[key];
        await addDoc(sportsCollectionRef, sport); // Add each sport as a document
        console.log(`Added sport: ${sport.name}`);
    }
};

// Call the function to add sports
addSportsToFirestore();
