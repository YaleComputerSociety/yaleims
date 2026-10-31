// Schema v3 migration (Phase 2, D27): reads the old collections, computes
// every v3 doc and writes what is missing. Dry run unless --apply.
//
//   npm run migrate -- [--apply] [--since=<ISO time>] [--report=<file>] [--show-refs] [--prod]
//
// --since: catch-up run after the cutover; pass the "finished at" time the
//          previous --apply run printed (see write.ts).
// --report: writes the full plan summary and every anomaly (with refs, which
//          may hold emails) as JSON. Keep it out of git.
// --show-refs: prints anomaly refs (emails, paths) on the console too; for
//          the emulator's sanitized data.
import { writeFileSync } from "node:fs";
import { Timestamp } from "firebase-admin/firestore";
import { db, target } from "./admin";
import { readOldData } from "./old";
import { buildPlan, type Anomaly } from "./transform";
import { readStoredV3, writePlan, type Outcome } from "./write";

const KNOWN = ["--apply", "--prod", "--show-refs"];
const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
for (const a of args) {
  if (!KNOWN.includes(a) && !a.startsWith("--since=") && !a.startsWith("--report=")) {
    console.error(`Unknown argument: ${a}`);
    process.exit(1);
  }
}
const apply = args.includes("--apply");
const showRefs = args.includes("--show-refs");
const reportPath = flag("--report");
const sinceArg = flag("--since");
const since = sinceArg ? Timestamp.fromDate(new Date(sinceArg)) : null;
if (sinceArg && isNaN(new Date(sinceArg).getTime())) {
  console.error(`--since is not a time: ${sinceArg}`);
  process.exit(1);
}

function printAnomalies(anomalies: Anomaly[]): void {
  const byKind = new Map<string, Anomaly[]>();
  for (const a of anomalies) byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a]);
  console.log(`\nAnomalies: ${anomalies.length}`);
  for (const [kind, list] of [...byKind].sort()) {
    const seasons = [...new Set(list.map((a) => a.seasonId ?? "global"))].sort().join(", ");
    console.log(`  ${kind}: ${list.length} (${seasons})`);
    for (const a of list.slice(0, showRefs ? list.length : 3)) {
      const parts = [a.seasonId, showRefs ? a.ref : undefined, a.detail].filter(Boolean);
      if (parts.length > 0) console.log(`      ${parts.join(" | ")}`);
    }
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`Target: ${target}`);
  console.log(
    `Mode: ${apply ? "APPLY" : "dry run (add --apply to write)"}` +
      (since ? `, catch-up since ${since.toDate().toISOString()}` : ", first run")
  );

  const old = await readOldData(db);
  const plan = buildPlan(old);
  console.log(`\nCurrent season: ${plan.currentSeasonId}; seasons: ${plan.seasonIds.join(", ")}`);
  for (const [key, value] of Object.entries(plan.info).sort()) console.log(`  ${key}: ${value}`);
  console.log(`  users to get v3 fields: ${plan.userUpdates.size}; usernames to get userId: ${plan.usernameUpdates.size}`);
  printAnomalies(plan.anomalies);

  const report = (extra: object) => {
    if (!reportPath) return;
    writeFileSync(
      reportPath,
      JSON.stringify(
        { target, startedAt, apply, since: sinceArg ?? null, currentSeasonId: plan.currentSeasonId, info: plan.info, standingsDiffs: plan.standingsDiffs, anomalies: plan.anomalies, ...extra },
        null,
        2
      )
    );
    console.log(`\nReport written to ${reportPath}`);
  };

  if (plan.standingsDiffs.length > 0) {
    console.error(`\nSTOP: the ${plan.currentSeasonId} standings differ from a recomputation from its results:`);
    for (const d of plan.standingsDiffs) console.error(`  ${d}`);
    console.error("Nothing was written.");
    report({ stopped: "standings" });
    process.exit(2);
  }
  console.log(`\nStandings check (${plan.currentSeasonId}): stored = recomputed from the results ✓`);

  const stored = await readStoredV3(db, plan.seasonIds);
  const summary = await writePlan(db, plan, stored, { apply, since });
  console.log(`\n${apply ? "Written" : "Would write"} (per kind of doc):`);
  const order: Outcome[] = ["create", "overwrite", "delete", "add-fields", "kept", "not-in-plan", "unchanged"];
  for (const [kind, counts] of Object.entries(summary.counts).sort()) {
    const parts = order.filter((o) => counts[o]).map((o) => `${o} ${counts[o]}`);
    console.log(`  ${kind}: ${parts.join(", ")}`);
  }
  if (summary.kept.length > 0) {
    console.log(`\nKept (differ from the plan, not the migration's to change): ${summary.kept.length}`);
    for (const path of summary.kept.slice(0, showRefs ? summary.kept.length : 0)) console.log(`  ${path}`);
  }
  if (apply) {
    console.log(`\nWrites: ${summary.writes}. Finished at: ${summary.finishedAt ?? "(nothing written)"}`);
    if (summary.finishedAt) console.log(`Catch-up after the rollout: npm run migrate -- --since=${summary.finishedAt} ...`);
  }
  report({ summary });
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
