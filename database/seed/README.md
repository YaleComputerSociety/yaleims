# Seed toolkit

Builds a **sanitized** copy of production Firestore data to load into the local
emulator (or a QA project), so you can test against realistic data without ever
exposing real user PII.

Pipeline: `export (prod, real PII)` → `sanitize` → `load (emulator)`.

## Prerequisites

```bash
npm install
```

You need a service-account key for `yims-125a2` to read production. The repo
already gitignores `database/misc/serviceaccount.json` — put yours there.

## 1. Export from production (read-only)

```bash
GOOGLE_APPLICATION_CREDENTIALS=../misc/serviceaccount.json npm run export
```

Writes `data/prod-dump.json`. **This file contains real PII and is gitignored —
never commit or share it.** The export is recursive (captures subcollections
like `users/{email}/seasons/{id}/bets`) and preserves Firestore types
(Timestamp/GeoPoint/DocumentReference) via sentinels.

Collections captured are listed in `collections.mjs`. `api_keys` /
`user_api_keys` are deliberately excluded.

## 2. Sanitize

```bash
npm run sanitize
```

Reads `data/prod-dump.json`, writes `data/seed.json`. Deterministically
anonymizes:

- user doc IDs `users/{email}` → `users/user{N}@example.edu` (and every
  embedded reference to that email, so bets/matches stay linked)
- PII fields: `email`, `name`, `firstName`, `lastName`, `fname`, `lname`,
  `netid`, `username`

`data/seed.json` is safe to commit if you want a shared dataset.

> Assumption: real user emails are the doc IDs of the top-level `users`
> collection. If the keying changes, update `collectRealEmails` logic in
> `sanitize.mjs`.

## 3. Load into the emulator

With the emulator running (`firebase emulators:start` from `database/`):

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run load
```

This refuses to run unless `FIRESTORE_EMULATOR_HOST` is set, so it can never
write to production.

For a fast repeatable loop, snapshot the loaded emulator once:

```bash
firebase emulators:export ./snapshot --project yims-125a2
```

then start future sessions pre-seeded:

```bash
firebase emulators:start --import=./seed/snapshot --export-on-exit=./seed/snapshot
```
