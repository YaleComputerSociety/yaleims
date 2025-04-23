import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import fs from "fs";
import csvParser from "csv-parser";

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

// Helper function to convert date and time into Firestore Timestamp
const convertToTimestamp = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;

  const [month, day] = dateStr.split("/").map(Number);
  const date = new Date(2025, month - 1, day); // Assume year is 2025

  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier.toLowerCase() === "pm" && hours !== 12) {
    hours += 12;
  } else if (modifier.toLowerCase() === "am" && hours === 12) {
    hours = 0;
  }

  date.setHours(hours, minutes, 0, 0);
  return Timestamp.fromDate(date);
};

// Function to parse CSV and add matches to Firestore
async function parseAndAddMatches(csvFilePath) {
  const matches = [];
  let autoIncrementId = 759; // Adjust as needed

  fs.createReadStream(csvFilePath)
    .pipe(csvParser())
    .on("data", (row) => {
      const {
        Date,
        Time,
        "Home College": homeCollege,
        "Away College": awayCollege,
        Location_Extra,
        Sport,
        Location,
        Type,
      } = row;

      const timestamp = convertToTimestamp(Date, Time);
      const matchId = autoIncrementId;

      const match = {
        away_college: awayCollege,
        away_college_participants: [],
        away_college_score: null,
        forfeit: null,
        home_college: homeCollege,
        home_college_participants: [],
        home_college_score: null,
        location: Location,
        sport: Sport,
        timestamp,
        location_extra: Location_Extra,
        type: Type || "Regular", // Default to "Regular" if Type is missing
        winner: null,
        id: matchId,
      };

      matches.push({ matchId, match });
      autoIncrementId++; // Increment for next match
    })
    .on("end", async () => {
      console.log(
        "CSV file successfully processed. Adding matches to Firestore..."
      );

      const batch = writeBatch(firestore);

      matches.forEach(({ matchId, match }) => {
        const docRef = doc(
          collection(firestore, "matches"),
          matchId.toString()
        );
        batch.set(docRef, match);
      });

      try {
        await batch.commit();
        console.log("All matches added successfully.");
      } catch (error) {
        console.error("Error adding matches to Firestore:", error);
      }
    })
    .on("error", (error) => {
      console.error("Error reading CSV file:", error);
    });
}

// Call the function with the path to your CSV file
parseAndAddMatches("data/Kanjam_Schedule.csv");
