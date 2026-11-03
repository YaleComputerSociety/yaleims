# database — Firestore configuration

| File | What |
|---|---|
| `firestore.rules` | Security rules for the browser: it may read a season doc and its standings (the live listeners), nothing else, and write nothing. The server uses the Admin SDK, which the rules don't apply to. Tests: `frontend/tests/rules/`. |
| `firestore.indexes.json` | Composite indexes and field overrides. Every query the server makes that combines filters or sorts needs one here (the emulator doesn't check; production answers "requires an index"). It still lists the indexes of the pre-v3 collections, kept until the old data is deleted. |
| `firebase.json` | Which rules and indexes deploy, and the emulator's ports (Firestore :8080, UI :4000). `npm run emulator` in `frontend/` uses it. |
| `misc/` | Hand-run admin scripts: the season rollover and the schedule spreadsheet converter (see `misc/README.md`). |
| `audit-log.md` | Inline and chunked audit records, the server reader, operation budgets, and maintenance guidance. |

The schema (schema v3: everything of a season under `seasons/{seasonId}`;
global `users`, `usernames`, `config/app`) is documented in
`frontend/src/types/firestore.ts`; every path is built in
`frontend/src/lib/paths.ts`.

Deploying rules or indexes is part of a release (`CONTRIBUTING.md` →
"Releasing"): from this folder,
`npx firebase-tools deploy --only firestore:indexes --project yims-125a2`
(before the build that uses them) and `--only firestore:rules` (after it).
