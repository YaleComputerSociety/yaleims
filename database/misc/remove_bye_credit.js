// One-off (D23): byes award no points. Brackets and tournaments created before that
// decision credited each bye winner with a game, a win and the sport's win points.
// This takes that credit back for one season's brackets and tournaments, then
// re-ranks the season (same rule as scoring).
//
// Usage: node remove_bye_credit.js <YYYY-YYYY> [--apply] [--prod]
//   Without --apply it only prints what it would change.
//
// Idempotent: each processed bracket/tournament doc gets `bye_credit_removed: true`
// (in the same transaction as its standings change) and is skipped afterwards.
// Docs created before 2025-10-25 (bcd298b, when bye crediting was added) are skipped.
// Delete this script once it has run in production.
import { db, FieldValue } from "./firebaseAdmin.js";

const BYE_CREDIT_ADDED = new Date("2025-10-25T00:00:00Z");
const seasonId = process.argv[2];
const apply = process.argv.includes("--apply");
if (!/^\d{4}-\d{4}$/.test(seasonId || "")) {
  console.error("Usage: node remove_bye_credit.js <YYYY-YYYY> [--apply] [--prod]");
  process.exit(1);
}

async function pointsForWin(tx, sport) {
  const snap = await tx.get(db.collection("sports").where("name", "==", sport));
  if (snap.empty) throw new Error(`No sport found with the name: ${sport}`);
  return snap.docs[0].data().points_for_win || 0;
}

async function processDoc(ref, label) {
  return db.runTransaction(async (tx) => {
    const doc = (await tx.get(ref)).data();
    if (!doc) return 0;
    if (doc.bye_credit_removed === true) {
      console.log(`${label}: already done, skipped`);
      return 0;
    }
    const createdAt = doc.createdAt?.toDate?.();
    if (!createdAt || createdAt < BYE_CREDIT_ADDED) {
      console.log(`${label}: created ${createdAt?.toISOString() ?? "(unknown)"}, before bye credit existed, skipped`);
      return 0;
    }
    const entries = (doc.matches || []).filter((e) => e.round === "Bye" && e.match_id);
    const byes = (await Promise.all(entries.map((e) => tx.get(db.doc(`matches/seasons/${seasonId}/${e.match_id}`)))))
      .map((s) => s.data())
      .filter((m) => m && m.type === "Bye" && m.winner);
    const points = byes.length > 0 ? await pointsForWin(tx, byes[0].sport) : 0;

    for (const m of byes) {
      console.log(`${label}: bye ${m.id} → ${m.winner}: games -1, wins -1, points -${points}`);
      if (apply) {
        tx.update(db.doc(`colleges/seasons/${seasonId}/${m.winner}`), {
          games: FieldValue.increment(-1),
          wins: FieldValue.increment(-1),
          points: FieldValue.increment(-points),
        });
      }
    }
    if (apply) {
      tx.update(ref, { bye_credit_removed: true, bye_credit_removed_at: FieldValue.serverTimestamp() });
    }
    return byes.length;
  });
}

async function recalculateRanks() {
  const standings = db.collection(`colleges/seasons/${seasonId}`);
  const now = new Date();
  const today = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(standings);
    const ranked = snap.docs
      .map((d) => ({ ref: d.ref, s: d.data() }))
      .sort((a, b) => (b.s.points || 0) - (a.s.points || 0) || (b.s.wins || 0) - (a.s.wins || 0));
    ranked.forEach(({ ref, s }, i) => {
      tx.update(ref, s.today !== today ? { today, prevRank: s.rank, rank: i + 1 } : { rank: i + 1 });
    });
  });
}

async function main() {
  console.log(`${apply ? "Applying" : "Dry run (add --apply to write)"}: season ${seasonId}`);
  const brackets = await db.collection(`brackets/seasons/${seasonId}`).get();
  const tournaments = await db.collection(`tournaments/seasons/${seasonId}`).get();
  let changed = 0;
  for (const d of brackets.docs) changed += await processDoc(d.ref, `bracket ${d.id}`);
  for (const d of tournaments.docs) changed += await processDoc(d.ref, `tournament ${d.id}`);
  if (apply && changed > 0) {
    await recalculateRanks();
    console.log("Standings re-ranked.");
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
