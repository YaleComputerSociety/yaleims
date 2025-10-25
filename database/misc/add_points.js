/**
 * add_points.js
 * Run with: node add_points.js
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  writeBatch,
  increment,
} from "firebase/firestore";
import fs from "fs";
import { parse } from "json2csv";

/** ─── 1. CONFIG ─── */
const SEASON_ID = "2025-2026";
const ADD_POINTS = 1000;

// ✅ Final confirmed user list (ignoring “not sure”)
const USERS = [
  "luke.weinbach@yale.edu",
  "arthur.gilfonov@yale.edu",
  "sihong.wu@yale.edu",
  "jaden.cohen@yale.edu",
  "rachel.mak@yale.edu",
  "christian.guirgis@yale.edu",
  "ethan.martinez@yale.edu",
  "david.pich@yale.edu",
  "robby.marshall@yale.edu",
  "mitchell.ichinkhorloo@yale.edu",
  "stephanie.wu@yale.edu",
  "leif.steele@yale.edu",
  "jerry.carmo@yale.edu",
  "henry.wykoff@yale.edu",
  "nic.spangler-turgesen@yale.edu",
  "benjamin.rosenthal@yale.edu"
];

/** ─── 2. FIREBASE INIT ─── */
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

/** ─── 3. MAIN FUNCTION ─── */
async function addPointsToUsers() {
  const batch = writeBatch(db);
  const missing = [];

  for (const email of USERS) {
    const seasonRef = doc(db, "users", email, "seasons", SEASON_ID);
    const snap = await getDoc(seasonRef);

    if (snap.exists()) {
      batch.update(seasonRef, { points: increment(ADD_POINTS) });
      console.log(`✅ Queued ${email} for +${ADD_POINTS} points`);
    } else {
      console.warn(`⚠️ No season document found for ${email}`);
      missing.push({ email });
    }
  }

  await batch.commit();
  console.log("🎯 All batch updates committed!");

  if (missing.length > 0) {
    const csv = parse(missing);
    fs.writeFileSync("missing_users.csv", csv);
    console.log(`⚠️ Saved ${missing.length} missing users to missing_users.csv`);
  }
}

addPointsToUsers().catch(console.error);
