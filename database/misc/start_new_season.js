// Season rollover, step 0: create colleges/seasons/{seasonId}/{abbr} docs.
//
// Usage:
//   node start_new_season.js 2027-2028 [--update-season-metadata] [--prod]
//
// Only creates docs that don't exist yet: re-running never resets a college's
// points. --update-season-metadata also points seasons/current at the new
// season and adds the previous one to seasons/past.years.
import { db } from "./firebaseAdmin.js";

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

const seasonId = process.argv[2];
if (!/^\d{4}-\d{4}$/.test(seasonId || "")) {
  console.error("Usage: node start_new_season.js <YYYY-YYYY> [--update-season-metadata] [--prod]");
  process.exit(1);
}
const updateSeasonMetadata = process.argv.includes("--update-season-metadata");
const startYear = Number(seasonId.slice(0, 4));
const previousSeason = `${startYear - 1}-${startYear}`;

function formatToday() {
  const d = new Date();
  return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
}

async function createSeasonDocs() {
  const today = formatToday();
  const seasonCol = db.collection("colleges").doc("seasons").collection(seasonId);

  for (const c of colleges) {
    const ref = seasonCol.doc(c.abbreviation);
    try {
      await ref.create({
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
      });
      console.log(`Created ${seasonId} season doc for ${c.abbreviation}`);
    } catch (err) {
      if (err.code !== 6) throw err; // 6 = ALREADY_EXISTS
      console.log(`Skip (already exists): ${c.abbreviation}`);
    }
  }

  if (updateSeasonMetadata) {
    await db.collection("seasons").doc("current").set(
      {
        year: seasonId,
        season: "fall",
        winningCollegeId: null,
        celebrationActive: false,
      },
      { merge: true },
    );
    console.log(`Updated seasons/current -> ${seasonId}`);

    const pastRef = db.collection("seasons").doc("past");
    const pastSnap = await pastRef.get();
    const existingYears = pastSnap.exists
      ? (pastSnap.data().years || []).filter((y) => typeof y === "string")
      : [];
    const years = Array.from(new Set([...existingYears, previousSeason]));
    await pastRef.set({ years }, { merge: true });
    console.log(`Updated seasons/past.years -> ${years.join(", ")}`);
  }

  console.log(`Done seeding colleges/seasons/${seasonId}.`);
  console.log(
    `\nRemaining rollover steps for ${seasonId}:\n` +
      `  1. ./create_season_indexes.sh ${seasonId}\n` +
      `     Firestore composite indexes are per collection id, so the new season has none.\n` +
      `     Without them the upcoming-matches queries fail and the schedules and signup pages break.\n` +
      `  2. node addNewSeasonUser.js ${seasonId} [--prod]\n` +
      `     Gives every existing user an empty seasons/${seasonId} doc. Until it runs,\n` +
      `     game sign-up returns 404, so existing users cannot sign up for games.\n` +
      `  (Elo is sidelined, so there is no Elo step; see functions/src/sidelined/elo/README.md.)`,
  );
}

createSeasonDocs().catch((err) => {
  console.error(err);
  process.exit(1);
});
