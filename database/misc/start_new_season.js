// Season rollover (schema v3): creates a season and copies over what carries
// from the previous one.
//
// Usage:
//   node start_new_season.js 2027-2028 [--make-current] [--prod]
//
// Creates, and never overwrites (a re-run skips what exists):
//   seasons/{seasonId}                 term "fall", no champion
//   seasons/{seasonId}/colleges/{id}   the previous season's colleges, standings at 0
//   seasons/{seasonId}/sports/{id}     the previous season's lineup, as it was
// --make-current also points config/app.currentSeasonId at the new season.
// The rollover is recorded in the new season's audit log (D32). Players join
// the season on their first login; captains and roles are set again in the
// app. Firestore indexes are global (firestore.indexes.json): nothing to add.
import { db, FieldValue } from "./firebaseAdmin.js";

const seasonId = process.argv[2];
if (!/^\d{4}-\d{4}$/.test(seasonId || "")) {
  console.error("Usage: node start_new_season.js <YYYY-YYYY> [--make-current] [--prod]");
  process.exit(1);
}
const makeCurrent = process.argv.includes("--make-current");
const startYear = Number(seasonId.slice(0, 4));

/** Today in Eastern time, "yyyy-mm-dd" (as frontend/src/lib/dates.ts). */
const easternToday = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

async function main() {
  // The previous season: the latest one that started before this one.
  const seasons = await db.collection("seasons").orderBy("startYear").get();
  const previous = seasons.docs.filter((d) => d.data().startYear < startYear).pop();
  if (!previous) throw new Error(`No season before ${seasonId} to copy colleges and sports from`);
  console.log(`Copying colleges and sports from ${previous.id}`);

  const [colleges, sports] = await Promise.all([
    db.collection(`seasons/${previous.id}/colleges`).get(),
    db.collection(`seasons/${previous.id}/sports`).get(),
  ]);
  const docs = [
    [`seasons/${seasonId}`, {
      label: seasonId,
      startYear,
      currentTerm: "fall",
      championCollegeId: null,
      celebrationActive: false,
      championshipUpdatedAt: null,
    }],
    ...colleges.docs.map((c) => [`seasons/${seasonId}/colleges/${c.id}`, {
      name: c.data().name,
      abbreviation: c.data().abbreviation,
      points: 0, games: 0, wins: 0, losses: 0, ties: 0, forfeits: 0,
      rank: 0, prevRank: 0, rankDate: easternToday,
    }]),
    ...sports.docs.map((s) => [`seasons/${seasonId}/sports/${s.id}`, s.data()]),
  ];

  const created = await db.runTransaction(async (tx) => {
    const existing = await tx.getAll(...docs.map(([path]) => db.doc(path)));
    const missing = docs.filter((_, i) => !existing[i].exists);
    for (const [path, data] of missing) tx.create(db.doc(path), data);
    if (makeCurrent) {
      tx.set(db.doc("config/app"), { currentSeasonId: seasonId }, { merge: true });
    }
    if (missing.length > 0 || makeCurrent) {
      tx.create(db.collection(`seasons/${seasonId}/auditLog`).doc(), {
        at: FieldValue.serverTimestamp(),
        actor: { userId: "script:start_new_season", roles: [] },
        action: "startNewSeason",
        params: { seasonId, from: previous.id, makeCurrent },
        targets: [...missing.map(([path]) => path), ...(makeCurrent ? ["config/app"] : [])],
        before: Object.fromEntries(missing.map(([path]) => [path, null])),
      });
    }
    return missing.map(([path]) => path);
  });

  console.log(`Created ${created.length} of ${docs.length} docs (the rest existed).`);
  if (makeCurrent) console.log(`config/app.currentSeasonId -> ${seasonId}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
