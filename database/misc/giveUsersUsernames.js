import { firestore } from "./firebase.js";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  setDoc,
  runTransaction,
  increment,
} from "firebase/firestore";

// Helper function to generate a unique username
const generateUsername = async (count) => {
  const adjectives = [
    "Swift",
    "Bold",
    "Clever",
    "Happy",
    "Brave",
    "Fierce",
    "Gentle",
    "Mighty",
    "Charming",
    "Lucky",
    "Fearless",
    "Noble",
    "Playful",
    "Quick",
    "Witty",
    "Serene",
    "Vivid",
    "Graceful",
    "Bright",
    "Silent",
    "Eager",
    "Calm",
    "Dynamic",
    "Friendly",
    "Humble",
    "Jolly",
    "Keen",
    "Loyal",
    "Patient",
    "Powerful",
    "Radiant",
    "Sharp",
    "Sturdy",
    "Valiant",
    "Wise",
    "Zealous",
    "Agile",
    "Cheerful",
    "Daring",
    "Elegant",
    "Fearsome",
    "Gleeful",
    "Heroic",
    "Joyful",
    "Kind",
    "Lively",
    "Modest",
    "Peaceful",
    "Resilient",
    "Spirited",
    "Strong",
    "Thoughtful",
    "Vibrant",
    "Warm",
    "Zesty",
  ];

  const nouns = [
    "Tiger",
    "Cloud",
    "Eagle",
    "Phoenix",
    "Wave",
    "Lion",
    "Bear",
    "Falcon",
    "River",
    "Mountain",
    "Sky",
    "Wolf",
    "Sun",
    "Moon",
    "Star",
    "Forest",
    "Ocean",
    "Hawk",
    "Stream",
    "Glacier",
    "Thunder",
    "Comet",
    "Dolphin",
    "Breeze",
    "Shadow",
    "Flame",
    "Blaze",
    "Meadow",
    "Canyon",
    "Galaxy",
    "Pebble",
    "Raven",
    "Snow",
    "Storm",
    "Tornado",
    "Valley",
    "Whale",
    "Zephyr",
    "Aurora",
    "Brook",
    "Lynx",
    "Meteor",
    "Puma",
    "Quasar",
    "Rain",
    "Sand",
    "Tide",
    "Vortex",
    "Wind",
    "Zenith",
    "Orca",
    "Jaguar",
    "Dragonfly",
  ];

  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective}${randomNoun}${count}`;
};

// Function to add usernames to all users in Firestore
const addUsernamesToUsers = async () => {
  const usersCollectionRef = collection(firestore, "users");
  const usersSnapshot = await getDocs(usersCollectionRef);

  if (usersSnapshot.empty) {
    console.log("No users found in the collection.");
    return;
  }

  const counterRef = doc(firestore, "counters", "usernames"); // Reference to the counter document
  const usernamesCollectionRef = collection(firestore, "usernames"); // Reference to the usernames collection

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();

    // Skip users that already have a username
    if (userData.username) {
      console.log(
        `User ${userDoc.id} already has a username: ${userData.username}`
      );
      continue;
    }

    // Increment the counter atomically
    const count = await runTransaction(firestore, async (transaction) => {
      const counterSnapshot = await transaction.get(counterRef);

      // If the counter document does not exist, initialize it
      if (!counterSnapshot.exists()) {
        transaction.set(counterRef, { count: 1 });
        return 1;
      }

      const currentCount = counterSnapshot.data().count || 0;
      const newCount = currentCount + 1;

      transaction.update(counterRef, { count: increment(1) });
      return newCount;
    });

    // Generate a unique username
    const generatedUsername = await generateUsername(count);

    // Update the user document with the new username
    const userRef = doc(firestore, "users", userDoc.id);
    await updateDoc(userRef, { username: generatedUsername });

    // Add the username to the usernames collection
    const usernameDocRef = doc(usernamesCollectionRef, generatedUsername);
    await setDoc(usernameDocRef, {
      email: userDoc.id,
    });

    console.log(`Added username "${generatedUsername}" to user ${userDoc.id}`);
  }

  console.log("Finished adding usernames to all users.");
};

// Call the function to add usernames to users
addUsernamesToUsers()
  .then(() => console.log("Usernames added successfully!"))
  .catch((error) => console.error("Error adding usernames:", error));
