# database/migrate — schema v3 migration

One-time migration of every old collection to schema v3 (Phase 2,
`seasons/{seasonId}/...`; design in the refactor docs, REDESIGN.md section 4).
It only **adds**: v3 docs, plus v3 fields on `users/{email}` (`roles`,
`claimedAt`, `createdBy`) and `usernames/{name}` (`userId`). Old data stays as
it is.

```bash
npm install
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run migrate              # dry run: what it would write + anomalies
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run migrate -- --apply   # write
```

Production needs `--prod` (refused otherwise) and credentials in
`../misc/serviceaccount.json` (gitignored) or Application Default Credentials.
Export a backup before any `--prod --apply`.

| Flag | |
|---|---|
| `--apply` | write (default: dry run) |
| `--since=<time>` | catch-up run after the cutover: pass the "Finished at" time of the previous `--apply` run. Docs the migration wrote are brought up to date with the old data (overwritten or deleted); docs written after that time (the new code) are kept. |
| `--report=<file>` | full JSON report (anomaly refs may hold emails: keep it out of git) |
| `--show-refs` | print anomaly refs on the console (fine for the emulator's sanitized data) |

What it guarantees:
- **Idempotent:** v3 docs are computed from the old data alone; a re-run
  creates only what is missing. Without `--since`, an existing v3 doc is
  never overwritten.
- **The current season is exact:** its standings must equal a recomputation
  from its results (+ tournament placement bonuses), else it stops before
  writing; a current-season match it can't map also stops it. Past seasons are
  best-effort: what can't be mapped is skipped and listed as an anomaly.
- Overwrites and deletes carry a `lastUpdateTime` precondition: a doc that
  changes while it runs fails the batch (re-run).

Files: `src/old.ts` reads the old collections, `src/transform.ts` maps them
to v3 (one function per entity), `src/write.ts` compares with what is stored
and writes, `src/main.ts` is the command line.
