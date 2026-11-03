# Code quality improvement log

This log tracks the findings from the November 3, 2026 app review of commit
`c75a18e`. Each
finding is handled with a concrete plan, implementation, meaningful
verification, and its own commit. Commit messages include the motivation
and the specific files changed. Only completed, verified fixes are marked
complete.

| Finding | Scope | Status |
| --- | --- | --- |
| R01 | Protect scored games during bracket corrections | Complete |
| R02 | Bound audit storage and large delete operations | Complete |
| R03 | Enforce match invariants and state transitions on the server | Pending |
| R04 | Reconcile rosters when a game's teams change | Pending |
| R05 | Migrate every reference when a placeholder is claimed | Pending |
| R06 | Prevent unintended writes from rejected NetID additions | Pending |
| R07 | Bind CAS login transactions to the initiating browser | Pending |
| R08 | Refresh vulnerable dependencies and maintain advisory checks | Pending |
| R09 | Bound pagination, historical queries, and roster-count reads | Pending |
| R10 | Standardize league dates and validate calendar input | Pending |
| R11 | Guarantee recovery of derived ranks after a score changes | Pending |
| R12 | Bound request sizes, rates, and upstream work | Pending |
| R13 | Handle partial success of bulk roster changes | Pending |
| R14 | Make failed and superseded reads explicit in the UI | Pending |
| R15 | Reduce image transfer and decoding costs | Pending |
| R16 | Audit privileged MVP changes | Pending |
| R17 | Extract nested React components and preserve focus/state | Pending |
| R18 | Consolidate bracket definitions and page responsibilities | Pending |
| R19 | Make development tooling and design references reproducible | Pending |

## R01 — Protect scored games during bracket corrections

Date: November 3, 2026. Status: complete.

**Motivation.** Correcting an earlier result could overwrite the participants
of an already scored game. Its points remained credited to the original
winner, while undoing it later deducted points from the replacement team.
Tournament semifinal results could similarly rewrite the final or
third-place game and invalidate placement bonuses.

**Plan.** Require later scores to be undone before scoring or undoing the
result that feeds them. Check both winner and loser destinations inside
the same Firestore transaction as the result change, and return HTTP 409
with the blocking game IDs. Cover normal correction order, legacy undone
feeders, tournament placements, and concurrent scoring requests.

**Specific file changes.**

- `frontend/src/server/services/brackets.ts`: check the transaction's next-game
  snapshots for final results and raise a conflict before any writes; include
  blocking game IDs in the existing API error format.
- `frontend/src/server/services/scoring.ts`: perform the bracket precondition
  check before reading standings in scoring and undoing; document the required
  correction order.
- `frontend/tests/integration/bracket-corrections.test.ts`: exercise the real API
  for rejected undo/rescore requests, unchanged data after rejection, safe
  corrections, winner/loser seed propagation, placement bonus reversal, and
  simultaneous scoring of adjacent rounds.
- `QUALITY-IMPROVEMENTS.md`: establish this change log and the findings checklist.

**Verification.** The two new rejection tests were first run against the
unfixed implementation; both failed because unsafe requests returned HTTP
204 instead of 409. After the fix:

- All six new regression cases passed against the isolated Firestore emulator
  on port 8182, including concurrent scoring and tournament bonus reversal.
- `npm run typecheck`, `npm run lint`, and `npm test` passed (63 unit tests).
- The full integration and Firestore rules suite passed (311 tests, including
  the six new cases).
- `NEXT_DIST_DIR=.next-r01-build npm run build` passed.
- `git diff --check` passed.

The API now rejects unsafe corrections with HTTP 409 and the blocking game
IDs. The tests confirm no writes on rejection. Correcting the earlier
result succeeds once the relevant later scores have been undone.

**Commit title.** `fix(brackets): protect scored games during result corrections`

## R02 — Bound audit storage and deletion work

Date: November 3, 2026. Status: complete.

**Motivation.** A deletion embedded every source snapshot in one audit
document. A game with 360 valid maximum-length Unicode reports exceeded
Firestore's 1 MiB document limit and returned HTTP 500. Deletions also
loaded all children in unbounded queries, and larger transactions could
exceed the separate transaction limits.

**Plan.** Preserve small inline records, put large lossless payloads in
private size-limited chunks, and reconstruct either format through one
server reader. Keep data and audit writes atomic. Page child reads inside
the transaction and return a clear conflict above explicit byte/target
budgets. Verify the original failure, preservation of native values,
deletion/point reversal, rejection without partial changes, rollback,
corruption detection, backward compatibility, and browser denial.

**Specific file changes.**

- `frontend/src/server/data/auditPayload.ts`: versioned lossless encoding,
  inline-depth check, and the shared payload/target/chunk limits.
- `frontend/src/server/data/auditLog.ts`: bounded inline/chunked audit writes,
  a complete reader with manifest/checksum checks, and paged child reads that
  stop at the operation budget.
- `frontend/src/server/data/util.ts`: translate Firestore's authoritative
  transaction-size rejection into a conflict while preserving unrelated errors.
- `frontend/src/types/firestore.ts`: document both storage forms and the
  complete reconstructed record.
- `frontend/src/lib/paths.ts`: centralize audit entry and payload chunk paths.
- `frontend/src/server/services/schedule.ts`: use bounded transactional child
  reads for game deletion.
- `frontend/src/server/services/brackets.ts`: use the same budget across all
  bracket games, linked records, standings, and team records.
- `frontend/src/server/data/scoreReports.ts` and
  `frontend/src/app/api/seasons/[seasonId]/matches/[matchId]/reports/route.ts`:
  move the game existence check and score snapshot into the report write
  transaction to prevent orphan reports during concurrent deletion.
- `frontend/scripts/seed.mts`: use the updated report creation contract.
- `database/firestore.indexes.json`: exempt private payload bytes from indexing.
- `database/audit-log.md` and `database/README.md`: document formats, reading,
  limits, deployment, and maintenance of over-budget operations.
- `frontend/tests/unit/audit-payload.test.ts`: verify native values, container
  tagging, numeric edge cases, and nesting behavior.
- `frontend/tests/unit/transactions.test.ts`: verify size-error classification
  and preservation of unrelated errors and successful results.
- `frontend/tests/integration/audit-storage.test.ts`: reproduce the original
  failure and exercise large deletes, preserved snapshots, limits, rollback,
  and legacy/corrupt records.
- `frontend/tests/rules/firestore.test.ts`: deny chunk reads, listing, and writes.
- `QUALITY-IMPROVEMENTS.md`: record R02's motivation, plan, changes, and checks.

**Verification.** The new 360-report regression failed against the original
implementation with HTTP 500 and Firestore's maximum-entity-size error.
After the fix:

- All nine audit integration cases passed, including concurrent report writes,
  complete snapshot reconstruction, scored tournament point reversal, and
  unchanged data after over-budget rejection or transaction rollback.
- All 21 Firestore rules cases passed, including private chunk reads, listing,
  and writes (30 focused integration/rules cases in total).
- `npm test` passed (76 unit tests). The full integration/rules suite passed
  against the isolated emulator on port 8182 (321 tests).
- `npm run typecheck`, `npm run lint`, and
  `NEXT_DIST_DIR=.next-r02-build npm run build` passed.
- `git diff --check` passed.

The original deletion now returns HTTP 204 and retains all 361 source
snapshots. Missing or corrupt payload chunks produce an explicit reader
error. Report creation checks the parent game inside its write transaction,
preventing orphan children during deletion.

**Operational bounds.** Actions above a 2 MiB encoded payload or 1,000 unique
targets are intentionally refused atomically with HTTP 409. Maintainer-led
archival is required before retrying such operations; the application does
not silently drop snapshots or partially delete records.

**Commit title.** `fix(audit): bound snapshot storage and deletion work`
