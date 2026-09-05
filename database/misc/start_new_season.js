import { firestore } from "./firebase.js";
import { doc, setDoc, collection, getDoc, updateDoc } from "firebase/firestore";

const colleges = [
  { abbreviation: "BF", name: "Benjamin Franklin" },
  { abbreviation: "BK", name: "Berkeley" },
  { abbreviation: "BR", name: "Branford" },
  { abbreviation: "DC", name: "Davenport" },
  { abbreviation: "ES", name: "Ezra Stiles" },
  { abbreviation: "GH", name: "Grace Hopper" },
  { abbreviation: "JE", name: "Jonathan Edwards" },
  { abbreviation: "MC", name: "Morse" },
  { abbreviation: "MY", name: "Pauli Murray" },
  { abbreviation: "PC", name: "Pierson" },
  { abbreviation: "SM", name: "Silliman" },
  { abbreviation: "SY", name: "Saybrook" },
  { abbreviation: "TC", name: "Trumbull" },
  { abbreviation: "TD", name: "Timothy Dwight" },
];

const seasonId = process.argv[2] || "2026-2027";
const updateSeasonMetadata = process.argv.includes("--update-season-metadata");

function formatToday() {
  const d = new Date();
  return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
}

async function createSeasonDocs() {
  const today = formatToday();

  for (const c of colleges) {
    const seasonCollectionRef = collection(firestore, "colleges", "seasons", seasonId);
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
      prevRank: 0,
    };

    await setDoc(collegeSeasonDocRef, seasonData, { merge: false });
    console.log(`Created ${seasonId} season doc for ${c.abbreviation}`);
  }

  if (updateSeasonMetadata) {
    const previousSeason = "2025-2026";
    const currentRef = doc(firestore, "seasons", "current");
    const pastRef = doc(firestore, "seasons", "past");

    await setDoc(
      currentRef,
      {
        year: seasonId,
        season: "fall",
        winningCollegeId: null,
        celebrationActive: false,
      },
      { merge: true },
    );
    console.log(`Updated seasons/current -> ${seasonId}`);

    const pastSnap = await getDoc(pastRef);
    const existingYears = pastSnap.exists()
      ? (pastSnap.data().years || []).filter((y) => typeof y === "string")
      : [];

    const years = Array.from(new Set([...existingYears, previousSeason]));
    await updateDoc(pastRef, { years });
    console.log(`Updated seasons/past.years -> ${years.join(", ")}`);
  }

  console.log(`Done seeding colleges/seasons/${seasonId}.`);
  console.log(
    `\nRemaining rollover steps for ${seasonId}:\n` +
      `  1. ./create_season_indexes.sh ${seasonId}\n` +
      `     Firestore composite indexes are per collection id, so the new season has none.\n` +
      `     Without them the upcoming-matches queries fail and the odds, schedules and signup pages break.\n` +
      `  2. node addNewSeasonUser.js ${seasonId}\n` +
      `     Gives every existing user a seasons/${seasonId} doc with 2000 points. Until it runs,\n` +
      `     getSeasonPoints and addBet return 404 and nobody can see coins or place bets.\n` +
      `  3. node initEloSeason.js ${seasonId}\n` +
      `     Seeds the Elo/odds docs so ratings start from a full, consistent shape.`,
  );
}

createSeasonDocs().catch((err) => {
  console.error(err);
  process.exit(1);
});
