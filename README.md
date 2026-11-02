# YaleIMs

The website of Yale's intramural sports league (yaleims.com): the Tyng Cup
standings, every game of the season with sign-up, schedules and scores,
playoff brackets and tournaments, and the Hub, where players see their games,
captains their teams, college reps name captains and MVPs, and admins upload
schedules and score games. Built and run by the Yale Computer Society (y/cs).

- **App:** Next.js (App Router, React 19, Tailwind CSS) in `frontend/`. Its
  API routes are the whole server; there is no separate backend.
- **Data:** Cloud Firestore, read and written only by the server (Firebase
  Admin SDK). The browser reads two public things live: the standings and
  the season doc.
- **Sign-in:** Yale CAS. The server keeps a signed session cookie (identity
  only); roles are read from Firestore on every request that needs them.
- **Hosting:** Firebase App Hosting (project `yims-125a2`, backend
  `yaleims-1`).

## Quick start

You need Node 22 and Java 21 (for the Firestore emulator). No access to
production is needed: everything runs against a local emulator with made-up
data.

```bash
git clone https://github.com/YaleComputerSociety/yaleims.git
cd yaleims/frontend
npm ci
cp .env.example .env.local        # then put any long random string in JWT_SECRET
npm run emulator                  # terminal 1: the Firestore emulator (UI on :4000)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed   # terminal 2: load the synthetic seed
npm run dev:emulator              # http://localhost:3000
```

To sign in, `npm run dev:token -- dev@example.edu` prints a line to paste
into the browser console (a session cookie for a seeded person). The seed's
people: `dev@example.edu` (admin and dev), `player001@example.edu` (a college rep),
`player002@example.edu` (a captain), `player003@example.edu` (a player).
Seed dates are placed relative to today, so there are always upcoming games;
`npm run seed` again resets everything.

Checks (CI runs the same, `.github/workflows/ci.yml`):

```bash
npm run typecheck && npm run lint && npm test   # unit tests: no emulator needed
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:integration   # API + rules tests; wipes the emulator
```

## How it fits together

```
browser ── pages (src/app/**/page.tsx) ── lib/api/<resource>.ts ──► /api/** (src/app/api/**/route.ts)
                                                                     │  validate → authorize → work → respond
                                                                     ├─ server/auth.ts        who is calling, what they may do
                                                                     ├─ server/services/*     logic across entities (scoring, brackets, sign-up…)
                                                                     └─ server/data/*         the only code that reads and writes Firestore
browser ── hooks/useStandings, useChampionship ──► Firestore (public reads only; database/firestore.rules)
```

Principles the code follows:

1. **The schema is the vocabulary.** `src/types/firestore.ts` defines every
   document. API responses are those documents plus their id, timestamps as
   ISO strings. Where an audience mustn't see emails, a response is the doc
   minus those fields (an `Omit<>` in `lib/api/`).
2. **URLs mirror database paths.** `/api/seasons/{s}/matches/{m}` is the
   document `seasons/{s}/matches/{m}`. Exceptions: `/api/me/*` (the caller)
   and `/api/matches` (results across seasons).
3. **One way to do each thing:** one route wrapper (`server/http.ts`), zod for
   every input, one error shape (`{ error: { code, message } }`), one place
   for permissions (`can` in `server/auth.ts`), one API client (`request()`
   in `lib/api/core.ts`).
4. **The server owns data and rules.** The browser never writes to
   Firestore; the security rules deny everything except the public live
   reads.
5. **Locality of behavior.** One file per real concern, read top to bottom,
   helpers next to their use. Each module starts with a comment saying what
   it owns.
6. **Pages stay thin.** A page fetches through `lib/api`, renders components
   and owns no business rules.

## Where things are

```
frontend/
  src/
    app/                 pages (one folder per URL) and app/api/** (the API routes)
    components/<area>/   components per page area; hub/{admin,rep,captain,player}; layout/, ui/ shared
    context/             SessionContext (who is signed in), SeasonContext (the season, its sports and colleges), filters, navbar
    hooks/               live Firestore listeners (useStandings, useChampionship) and small UI hooks
    lib/                 code shared by server and browser: dates, results, brackets, colleges, sports order, CSV parsing (csv/), paths.ts (every Firestore path)
    lib/api/             the API contract per resource: zod request schemas, response types, typed client calls
    server/              server-only: http.ts (route wrapper), auth.ts (viewer + permissions), session.ts, yaleLogin.ts (CAS + Yalies)
    server/data/         one module per collection: its reads and writes
    server/services/     operations spanning collections: scoring, standings, brackets, schedule upload, sign-ups, roles, accounts
    types/firestore.ts   the schema (schema v3)
    proxy.ts             same-origin check on every API write (CSRF)
  scripts/               seed.mts, dev-token.mts, make-admin.mts, test-integration.mts
  tests/                 unit/, integration/ (API against the emulator), rules/ (Firestore rules); see tests/README.md
  apphosting.yaml        App Hosting settings: env vars, secrets (RUNTIME only)
database/                Firestore rules, indexes, emulator config; misc/ admin scripts (season rollover)
sidelined/elo/           switched-off Elo ratings code, kept for later (see its README)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md): branches and pull requests, how to
add a route, a page or a field, the tests, and how a release goes out.
Contributions from outside the YaleIMs team are welcome as pull requests;
for a feature of your own design, reach out first at
yalecomputersociety@gmail.com.

## Main contributors

- Daniel Morales ('27)
- Ephraim Akai-Nettey ('27)
- Kaitlyn Oikle ('27)
- Brian Di Bassinga ('26)
- Vojtech Kysilka ('28)
- Farhan Baig ('27)
- Ella White ('27)
- Claire Guo ('29)
- Ben Le ('29)
