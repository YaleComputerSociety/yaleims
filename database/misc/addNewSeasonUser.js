// Season rollover, step 2: give every user an empty users/{email}/seasons/{seasonId}
// doc (addParticipant requires it).
//
// Usage: node addNewSeasonUser.js 2027-2028 [--prod]
//
// Existing season docs are skipped, so re-running never resets anyone's sign-ups.
import { db } from "./firebaseAdmin.js";

const seasonId = process.argv[2];
if (!/^\d{4}-\d{4}$/.test(seasonId || "")) {
  console.error("Usage: node addNewSeasonUser.js <YYYY-YYYY> [--prod]");
  process.exit(1);
}

async function addSeasonToAllUsers() {
  const usersSnap = await db.collection("users").get();
  console.log("Users found:", usersSnap.size);

  let batch = db.batch();
  let ops = 0;
  let created = 0;

  for (const userDoc of usersSnap.docs) {
    const seasonRef = userDoc.ref.collection("seasons").doc(seasonId);
    if ((await seasonRef.get()).exists) {
      console.log("Skip (already exists):", userDoc.id);
      continue;
    }

    batch.create(seasonRef, { matches: [] });
    ops++;
    created++;

    // Firestore batches max 500 writes
    if (ops === 500) {
      await batch.commit();
      console.log("Committed 500 season docs...");
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  console.log(`Done. Created season ${seasonId} for ${created} user(s).`);
}

addSeasonToAllUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});
