# Tests

- `unit/`: pure logic, contracts, and server behavior with external boundaries stubbed.
- `integration/`: real HTTP API behavior and emulator state; `helpers.ts` provides API/session/data helpers.
- `rules/`: permitted and denied browser Firestore operations.

From `frontend/`, use `npm test` for unit tests, `npm run test:integration`
with a running emulator, or `npm run test:emulator` to manage one automatically.
Integration runs wipe/reseed the emulator project and run sequentially.
The harness serves fake Yalies on the app port + 1 and fake CAS on port + 2.
`casFetch.mjs` is preloaded only into the test app process to redirect CAS
validation to that local fixture; production code has no CAS test override.
See [CONTRIBUTING](../../CONTRIBUTING.md#tests-and-debugging) for filters and setup.
