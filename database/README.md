# Firestore configuration

- `firebase.json`: emulator ports and rules/index paths; used by `npm run emulator` in `frontend/`.
- `firestore.rules`: public season/standings reads; all browser writes denied.
- `firestore.indexes.json`: production indexes and field overrides, including
  TTL cleanup on private `loginAttempts.expiresAt` (no timestamp index).
- `misc/`: optional season rollover and schedule-conversion scripts.

Document types are in `frontend/src/types/firestore.ts`; paths are in
`frontend/src/lib/paths.ts`. The emulator does not enforce composite indexes.
See [CONTRIBUTING](../CONTRIBUTING.md#releasing-maintainers) for deployment.
Login attempt expiry is enforced by the server even before TTL cleanup. Deploy
the reviewed TTL configuration with the indexes during an authorized release;
local emulator checks do not verify cloud TTL execution.
