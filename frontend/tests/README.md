# Tests

| Command | What | Needs |
|---|---|---|
| `npm test` | Unit tests (`tests/unit`): the pure shared code in `src/lib` | nothing |
| `npm run test:integration` | Integration tests (`tests/integration`) against the running app, and the Firestore rules tests (`tests/rules`) | the Firestore emulator |

`npm run test:integration` loads the synthetic seed into the emulator (this
**wipes the emulator's data**), starts the app on port 3210 with a throwaway
session secret, runs the tests and stops the app. Start the emulator first
(`npm run emulator`, needs Java 21) and set
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`. CI runs the same command under
`firebase emulators:exec` with the offline project `demo-yims`
(`.github/workflows/ci.yml`).

Writing an integration test: `tests/integration/helpers.ts` has `api()`
(calls the app; writes carry our Origin like a browser), `sessionFor()` (a
session cookie for a seeded person), `people` (who is who in the seed) and
`db` (the emulator, to check what a call changed). The seed is
`scripts/seed.mts`; tests may change its data, and the next run reloads it.
