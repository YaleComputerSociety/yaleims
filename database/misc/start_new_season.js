import { firestore } from './firebase.js';
import { doc, setDoc, collection } from 'firebase/firestore';

const colleges = [
  { abbreviation: "BF", name: "Benjamin Franklin" },
  { abbreviation: "BK", name: "Berkeley" },
  { abbreviation: "BR", name: "Branford" },
  { abbreviation: "DC", name: "Davenport" },
  { abbreviation: "ES", name: "Ezra Stiles" },
  { abbreviation: "GH", name: "Grace Hopper" },
  { abbreviation: "JE", name: "Jonathan Edwards" },
  { abbreviation: "MC", name: "Morse" },
  { abbreviation: "PM", name: "Pauli Murray" },
  { abbreviation: "PC", name: "Pierson" },
  { abbreviation: "SM", name: "Silliman" },
  { abbreviation: "SY", name: "Saybrook" },
  { abbreviation: "TC", name: "Trumbull" },
  { abbreviation: "TD", name: "Timothy Dwight" }
];

const seasonId = "2025-2026"; // change as needed

function formatToday() {
  const d = new Date();
  return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`; // e.g. 19-7-2025
}

async function createSeasonDocs() {
  const today = formatToday();

  for (const c of colleges) {
    // Path: colleges/seasons/{seasonId}/{ABBREV}
    const seasonCollectionRef = collection(firestore, 'colleges', 'seasons', seasonId);
    const collegeSeasonDocRef = doc(seasonCollectionRef, c.abbreviation);

    const seasonData = {
      abbreviation: c.abbreviation,
      name: c.name,
      today,
      points: 0,
      games: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      forfeits: 0,
      rank: 0,
      prevRank: 0
    };

    await setDoc(collegeSeasonDocRef, seasonData, { merge: false });
    console.log(`Created ${seasonId} season doc for ${c.abbreviation}`);
  }

  console.log('Done.');
}

createSeasonDocs().catch(err => console.error(err));
