// upsertMatches.ts
// node upsertMatches.ts

/** ✱ 1. CONFIG ✱ */
const CSV_FILE = "data/Soccer_Fall_2025_schedule_formatted.csv";
const SEASON_ID = "2025-2026"; // season we are inserting into

/** ✱ 2. FIREBASE SETUP ✱ */
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  Timestamp,
  getDoc,
  increment,
} from "firebase/firestore";
import fs from "fs";
import csvParser from "csv-parser";

const firebaseConfig = {
  apiKey: "AIzaSyB4ja4JXughIwxLPEt42mNClHH53sN0D6Q",
  authDomain: "yims-125a2.firebaseapp.com",
  projectId: "yims-125a2",
  storageBucket: "yims-125a2.appspot.com",
  messagingSenderId: "846558223250",
  appId: "1:846558223250:web:38c418708cc6f04e003f4b",
};
initializeApp(firebaseConfig);
const db = getFirestore();

/** ✱ 3. UTIL: "1/23" + "7:30 PM" → Firestore Timestamp ✱ */
const toTimestamp = (dateStr, timeStr, year = 2025) => {
  if (!dateStr || !timeStr) return null;
  const [mm, dd] = dateStr.split("/").map(Number);
  const [clock, part] = timeStr.split(" ");
  let [hh, min] = clock.split(":").map(Number);
  if (part.toLowerCase() === "pm" && hh !== 12) hh += 12;
  if (part.toLowerCase() === "am" && hh === 12) hh = 0;
  return Timestamp.fromDate(new Date(year, mm - 1, dd, hh, min, 0, 0));
};

/** ✱ 4. MAIN PIPELINE ✱ */
async function upsertMatches() {
  /* 4-A. figure out starting ID using the counter */
  const counterRef = doc(db, "counters", "matches");          // /counters/matches
  const counterSnap = await getDoc(counterRef);
  const currentCount = counterSnap.exists() ? counterSnap.data().count ?? 0 : 0;

  let nextId = currentCount + 1;  // first new match id

  /* 4‑B. read CSV into array */
  const matches = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE)
      .pipe(csvParser())
      .on("data", (row) => {
        const {
          Date: dateStr,
          Time: timeStr,
          "Home College": homeCollege,
          "Away College": awayCollege,
          Room,
          Sport,
          Location,
        } = row;

        matches.push({
          id: nextId++,
          away_college: awayCollege,
          away_college_participants: [],
          away_college_score: null,
          home_college: homeCollege,
          home_college_participants: [],
          home_college_score: null,
          forfeit: null,
          location: Location,
          location_extra: Room,
          sport: Sport,
          timestamp: toTimestamp(dateStr, timeStr),
          type: "Regular",
          winner: null,
        });
      })
      .on("end", () => resolve())
      .on("error", reject);
  });

  /* 4‑C. batch write */
  const batch = writeBatch(db);
  for (const m of matches) {
    const ref = doc(db, "matches", "seasons", SEASON_ID, m.id.toString());
    batch.set(ref, m, { merge: true });
  }
  
  batch.update(counterRef, { count: increment(matches.length) });

  await batch.commit();
  console.log(
    `✅ Upserted ${matches.length} matches (IDs ${currentCount + 1}-${nextId - 1}).`
  );
}

upsertMatches().catch(console.error);
