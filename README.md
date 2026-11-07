# YaleIMs

[YaleIMs](https://yaleims.com) is Yale's intramural sports website, built and
maintained by the Yale Computer Society. It provides Tyng Cup standings,
schedules, game sign-ups, results, playoffs, tournaments, and a role-based
Hub for players, captains, college representatives, supervisors, and admins.

## Stack and architecture

The application is **Next.js 16 App Router, React 19, TypeScript, and Tailwind
CSS 3**. `frontend/` contains both the website and the HTTP API. Firestore
stores the data; the server uses the Firebase Admin SDK. Yale CAS and Yalies
provide identity, with an application JWT session cookie. Roles are read
from Firestore when a request needs them.

```text
page/component → lib/api contract/client → app/api route → service → data module → Firestore
                                            ↓
                                    server authorization
```

The browser uses Firestore directly for two public live reads: standings
and the season's championship state. Every other database operation goes
through the API. Firestore rules deny all browser writes; API authorization
is essential because the Admin SDK bypasses those rules.

## Local development

Use **Node 22.9+ in the 22.x line**, npm, Git, and **Java 21+** on PATH.
CI uses Node 22 and Java 21. With an existing nvm installation, run
`nvm install` and `nvm use` at the Git root to use `.nvmrc`. Verify your
installation with `node --version`, `npm --version`, and `java -version`.

No production credentials, service account, Firebase login, or shared
secret file is needed for the standard emulator workflow. The first install
and emulator launch require internet access.

```bash
git clone https://github.com/YaleComputerSociety/yaleims.git
cd yaleims/frontend
npm ci
npm run dev:setup
npm run dev:doctor
```

`dev:setup` creates ignored `.env.local` from `.env.example` and generates
your local session secret. It preserves an existing file. `dev:doctor`
checks runtime versions and the standard emulator configuration.

**Terminal 1**, from `frontend/`:

```bash
npm run emulator
```

Wait for **All emulators ready**. Firestore uses `127.0.0.1:8080`; the
[Emulator UI](http://127.0.0.1:4000) uses port 4000. The local project is
`demo-yims`; CLI, browser, server, and helpers must use that same namespace.

**Terminal 2**, also from `frontend/`:

```bash
npm run seed
npm run dev:emulator
```

Open [localhost:3000](http://localhost:3000). The synthetic seed includes two
seasons, colleges, sports, games, standings, rosters, reports, and brackets.
Dates move with today. **Seeding wipes the configured emulator project's
data**; reseed and refresh when you need a clean starting point.

**Terminal 3**, from `frontend/`, for local sign-in:

```bash
npm run dev:token -- dev@example.edu
```

Paste the printed cookie command into DevTools Console on `localhost:3000`.
Use the same hostname throughout. Useful seeded identities:

| Identity | Role |
|---|---|
| `dev@example.edu` | Admin and legacy dev |
| `supervisor@example.edu` | Supervisor |
| `player001@example.edu` | Benjamin Franklin college representative |
| `player002@example.edu` | Captain for BF's first current-term sport |
| `player003@example.edu` | Captain for BF's second current-term sport |
| `player004@example.edu` | Regular BF player |

Token login bypasses external CAS. Real CAS sign-in and live Yalies directory
lookups require the optional Yalies API key; the integration tests use a fake
directory. The seeded accounts suffice for ordinary development.

## Checks and commands

Run application commands from `frontend/`; there is no root package.json.

| Command | Purpose |
|---|---|
| `npm run dev:setup` / `npm run dev:doctor` | Create local settings / check prerequisites and defaults |
| `npm run emulator` / `npm run seed` | Start local Firestore / reset synthetic data |
| `npm run dev:emulator` | Interactive Next website and API on port 3000 |
| `npm run dev` | Plain Next dev; follows the environment configuration |
| `npm run dev:token -- USER_ID` | Generate a seeded user's local session cookie (the seed's ids are emails) |
| `npm run make-admin -- NETID` | Grant admin/dev to an existing emulator account (NetID or user id) |
| `npm run check` | Typecheck, lint, and unit tests, stopping on failure |
| `npm run typecheck` / `npm run lint` / `npm test` | Run an individual check |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:integration` | API and rules tests using a running emulator; reseeds its project |
| `npm run test:emulator` | Start an emulator, run the API/rules suite, and shut it down; emulator ports must be free |
| `npm run build` / `npm start` | Build / serve the production application locally |

Before review, with the emulator running:

```bash
npm run check
npm run test:integration
# Stop the interactive Next dev server before this build:
npm run build
```

The integration runner uses its own Next server on 3210, fake directory on
3211, and `.next-test/` output. It can coexist with the interactive app, but
both see the reseeded emulator data. Run one integration suite at a time.
`TEST_PORT=3220 npm run test:integration` uses 3220/3221 instead.

CI audits all three npm lockfiles and runs typecheck, unit tests, lint, build,
the emulator suite, and inactive Elo checks. Weekly audits and Dependabot PRs
keep dependencies under review. See
[CONTRIBUTING.md](CONTRIBUTING.md) for targeted tests, change conventions,
maintenance, and releases.

## Repository map

| Path | Responsibility |
|---|---|
| `frontend/src/app/` | URL-based pages and `api/**/route.ts` handlers |
| `frontend/src/components/` | UI by feature, including game day and Hub roles |
| `frontend/src/context/`, `hooks/` | Session/season/UI state and live listeners |
| `frontend/src/lib/api/` | Zod input schemas, response types, and typed clients |
| `frontend/src/lib/` | Shared dates, formatting, CSV, paths, and result calculations |
| `frontend/src/server/` | Session, permissions, CAS, HTTP helpers, and Admin initialization |
| `frontend/src/server/data/`, `services/` | Persistence and domain transactions |
| `frontend/src/types/firestore.ts` | Schema v3 document definitions |
| `frontend/src/proxy.ts` | Same-origin protection for API writes |
| `frontend/tests/`, `scripts/` | Unit/API/rules tests and development/maintenance helpers |
| `frontend/public/` | Static images and assets |
| `database/` | Firestore rules, indexes, emulator config, maintenance scripts |
| `sidelined/elo/` | Inactive ratings/research package with its own checks |
| `.github/workflows/ci.yml` | Pull-request and main-branch checks |

Production configuration is in `frontend/apphosting.yaml`: Firebase project
`yims-125a2`, App Hosting backend `yaleims-1`, serving `yaleims.com`.
Deployment requires maintainer access; local setup does not deploy anything.

## Contributing

Contributions are welcome through pull requests. Read
[CONTRIBUTING.md](CONTRIBUTING.md) before changing APIs, data, permissions,
or deployment configuration. For a new feature proposal, contact
[yalecomputersociety@gmail.com](mailto:yalecomputersociety@gmail.com).

## Main contributors

- Daniel Morales ('27)
- Ephraim Akai-Nettey ('27)
- Kaitlyn Oikle ('27)
- Brian Di Bassinga ('26)
- Vojtech Kysilka ('28)
- Farhan Baig ('27)
- Ella White ('27)
- Ben Le ('29)
- Claire Guo ('29)
