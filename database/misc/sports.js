import { firestore } from './firebase.js'; // Import Firestore
import { collection, addDoc } from 'firebase/firestore'; // Firestore functions

const sports = [
    { id: 1, name: "Soccer", points: 11, season: "fall", emoji: "⚽" },
    { id: 2, name: "Flag Football", points: 6, season: "fall", emoji: "🏈" },
    { id: 3, name: "Spikeball", points: 6, season: "fall", emoji: "🦔" },
    { id: 4, name: "Cornhole", points: 6, season: "fall", emoji: "🌽" },
    { id: 5, name: "Pickleball", points: 6, season: "fall", emoji: "🥒" },
    { id: 6, name: "Ping Pong", points: 10, season: "fall", emoji: "🏓" },
    { id: 7, name: "W-Hoops", points: 5, season: "winter", emoji: "🏀" },
    { id: 8, name: "M-Hoops", points: 5, season: "winter", emoji: "🏀" },
    { id: 9, name: "C-Hoops", points: 5, season: "winter", emoji: "🏀" },
    { id: 10, name: "Dodgeball", points: 8, season: "winter", emoji: "🤾" },
    { id: 11, name: "Broomball", points: 6, season: "winter", emoji: "🧹" },
    { id: 12, name: "Indoor Soccer", points: 5, season: "spring", emoji: "🥅" },
    { id: 13, name: "Volleyball", points: 6, season: "spring", emoji: "🏐" },
    { id: 14, name: "Badminton", points: 6, season: "spring", emoji: "🏸" }
];

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
