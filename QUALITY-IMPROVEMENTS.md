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
| R02 | Bound audit storage and large delete operations | Pending |
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
