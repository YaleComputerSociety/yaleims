import { firestore } from './firebase.js'; // Import Firestore
import { doc, setDoc, collection } from 'firebase/firestore'; // Firestore functions

const sports = [
    { id: "2", name: "Flag Football", points_for_win: 6, emoji: "🏈", season: { "2024-2025": "Fall" } },
    { id: "3", name: "Spikeball", points_for_win: 6, emoji: "🤾", season: { "2024-2025": "Fall" } },
    { id: "4", name: "Cornhole", points_for_win: 6, emoji: "🌽", season: { "2024-2025": "Fall" } },
    { id: "5", name: "Pickleball", points_for_win: 6, emoji: "🥒", season: { "2024-2025": "Fall" } },
    { id: "6", name: "Table Tennis", points_for_win: 8, emoji: "🏓", season: { "2024-2025": "Fall" } }
];

// Function to add sports to Firestore
const addSportsToFirestore = async () => {

    for (const sport of sports) {
        const sportsRef = doc(firestore, 'sports', sport.id); // Reference to sports collection // Use id as the document ID, ensure it's a string
        await setDoc(sportsRef, {
            name: sport.name,
            points_for_win: sport.points_for_win,
            emoji: sport.emoji,
            season: sport.season
        });// Add or overwrite the sport document
        console.log(`Added sport: ${sport.name}`);
    }
};

addSportsToFirestore();

// // Simple test data
// const testSport = {
//     name: "Soccer",
//     points_for_win: 10
// };

// // Function to add a simple document to Firestore
// const addTestSportToFirestore = async () => {
//     try {
//         // Reference to the Firestore collection and document ID (using 'test-sport' as a static ID for testing)
//         const sportRef = doc(firestore, 'sports', 'test-sport');

//         // Write the test data to Firestore
//         await setDoc(sportRef, testSport);

//         console.log("Test sport added successfully");
//     } catch (error) {
//         console.error("Error adding test sport:", error);
//     }
// };

// console.log("hello?")


// // Call the function to add sports
// addTestSportToFirestore();
