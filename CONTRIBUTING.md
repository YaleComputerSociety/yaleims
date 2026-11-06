# Contributing to YaleIMs

Use [README.md](README.md) for the application map and emulator setup.
Run application commands from `frontend/`. Production releases and maintenance
require maintainer access; ordinary local work uses synthetic data.

## Branches and review

Create a focused branch from the team's current base, normally `main`:
`feat/topic`, `fix/topic`, `chore/topic`, or `refactor/topic`. Inspect existing
working changes before switching branches. Use Conventional Commit messages,
for example `fix(matches): reject empty match edits`.

Before opening a pull request:

```bash
# frontend/; Firestore emulator already running
npm run check
npm run test:integration
# Stop your interactive Next dev server before building:
npm run build
```

Alternatively, with emulator ports free, `npm run test:emulator` manages the
emulator for the API/rules suite. The suite wipes and reseeds its configured
emulator project. Refresh the interactive app and rediscover generated IDs
afterward. Test touched screens as their allowed and refused roles, signed
out where relevant, and at narrow widths for UI changes.

Describe the resulting behavior, reason for the change, and validation you
actually performed. Wait for CI and review before merging. A merge is not a
substitute for the maintainer release procedure below.

Never commit local environment files, service-account keys, real student
records, backups, generated output, or emulator logs. Keep repository Markdown
to the root `README.md`, root `CONTRIBUTING.md`, and concise directory
`README.md` files. Detailed guides, reviews, specifications, research notes,
and change logs belong outside the Git checkout. The ignore rules also cover
generated agent Markdown; it can reappear locally when Next runs.

## Code boundaries

- Pages and components own interaction and rendering. Fetch through
  `src/lib/api`; use `useSession()` and `useSeason()` for shared state.
- `src/lib/api/<resource>.ts` owns strict Zod request/query schemas, response
  types, serialization, and typed calls through `request()`.
- `src/app/api/**/route.ts` owns HTTP handling. Use `route()`, `readBody()`,
  `readQuery()`/`readParams()` as appropriate, and the standard response helpers.
- `src/server/auth.ts` owns named permission rules in `can`. A hidden button
  does not authorize an action. Read current roles from Firestore, not token
  claims; use `authorize(can.rule, ...)` for privileged handlers.
- Data modules own Firestore access and references. Services coordinate
  domain operations across entities and use transactions for related writes.
- Shared pure behavior belongs in `src/lib`. Server modules use `server-only`
  to keep privileged code out of browser bundles.

URLs generally mirror season-scoped document paths, with caller-specific
`/api/me/*` and cross-season `/api/matches` exceptions. Use GET to read, POST
to create, PATCH to edit fields, PUT to set a resource, and DELETE to remove.
Successful handlers use `ok()`, `created()`, or `noContent()`; expected failures
throw `ApiError`. The error shape is `{ error: { code, message } }`, optionally
with details. Lists use `{ items, total }`; use existing pagination conventions.

API writes require an Origin matching their host and port (`src/proxy.ts`).
CLI tests should use `tests/integration/helpers.ts` or set that header explicitly.
Serialize timestamps through the existing JSON helpers and omit private fields
for each audience; do not return raw stored records indiscriminately.

## Adding or changing behavior

1. Update the resource contract in `src/lib/api` and the relevant types.
2. Add a named permission if needed, then implement the route using the
   existing HTTP and authorization helpers.
3. Put persistence in `server/data` and multi-entity behavior in a service.
   Transaction callbacks can retry: finish reads before writes and keep
   external side effects outside retried callbacks.
4. Audit privileged mutations in the same transaction as their changes.
   Use `logAction()` and the existing size budgets. Read complete audit
   records through `getAuditLog()` so chunked payloads are reconstructed.
   A rejected operation must not leave partial changes or partial audit data.
5. Add tests for invalid input, permissions, domain conflicts, and stored
   effects. Check affected UI states, including loading and failed requests.

Scoring, undo, bracket advancement, standings, team records, and audit history
are related operations. Preserve their invariants together, including rejection
of a correction that would overwrite an already scored downstream game.
The sport is fixed when a game is created. A college replacement clears its
entire roster, including attendance; the incoming college starts blank, and
the remaining college's entries stay. Schedule edits and bracket advancement
share `services/matchRoster.ts`; include its changes in the same audited
transaction. A home/away swap retains both colleges' entries.
Use `lib/dates.ts` for league-day rules in Eastern time; be explicit when UI
presentation uses the viewer's local time instead.

## Schema, queries, and rules

`src/types/firestore.ts` defines the stored schema; `src/lib/paths.ts` builds
paths. Add fields there and handle existing documents with defaults or a
reviewed backfill. Update the synthetic seed when a new field or scenario
should be exercised locally. Keep user-provided path segments validated.

Review `database/firestore.indexes.json` for every new query shape. The emulator
does not enforce composite indexes or every production size/transaction limit.
Check relevant limits and arrange a maintainer-controlled cloud check when
needed. Deploy new indexes and wait until ready before releasing dependent code.

`database/firestore.rules` permits public browser reads only for season docs
and standings, and denies browser writes. The Admin SDK bypasses these rules,
so API permissions and privacy checks are separate. Changes to browser access
need rules tests and a coordinated release.

## Tests and debugging

| Change | Where to test |
|---|---|
| Pure rules, formatting, dates, input contracts | `tests/unit/` |
| HTTP/domain behavior and stored side effects | Resource tests in `tests/integration/` |
| Route authorization | `tests/integration/auth-matrix.test.ts` |
| Browser Firestore policy | `tests/rules/firestore.test.ts` |
| Browser interactions, layout, accessibility | Manual checks in the browser; no browser E2E suite is configured |

```bash
npm test -- tests/unit/format.test.ts
npm run test:watch -- tests/unit/format.test.ts
npm run test:integration -- tests/integration/matches.test.ts
npm run test:integration -- tests/integration/matches.test.ts -t "reschedules"
npm run test:integration -- tests/rules/firestore.test.ts
```

The integration wrapper starts Next on 3210 in `.next-test/`, supplies a
throwaway session secret, and serves fake Yalies on 3211. Use the wrapper
rather than invoking the integration Vitest project directly. Its helpers
provide `api()`, `sessionFor()`, `people`, `seasons()`, and the emulator `db`.
Files run sequentially because they share state. Unit tests need no emulator.

Use browser Network/Console for requests and UI failures, the Next terminal
for server errors, and the Emulator UI for stored effects. A 401 indicates
session failure; a 403 can indicate authorization or Origin; a 409 indicates
a domain conflict. Build and interactive dev share `.next/`, so stop dev
before building. If a restricted runner cannot start Turbopack workers,
`npm run build -- --webpack` selects the alternative compiler.

The emulator suite does not test real CAS, cloud IAM, production indexes, or
browser rendering. Cover those boundaries explicitly when changing them.
For Elo package changes, from `sidelined/elo/` run `npm ci`,
`npm run typecheck`, and `npm run check:not-imported` (also enforced in CI).

## Maintenance

Maintenance scripts are optional; install their package only when needed.
`database/misc/firebaseAdmin.js` uses the emulator host when set and otherwise
requires explicit `--prod`. Production scripts use maintainer credentials;
local emulator work needs none. Keep input policies, plans, snapshots, and
backups outside the repository.

Keep `frontend/scripts/` focused on recurring development and test commands.
One-off data corrections belong in a maintainer workspace outside this checkout,
alongside their purpose, source revision, reviewed policy, backup, execution
record, and dedicated tests. Keep reusable domain logic in `src/lib` or the
server services and cover it with the application tests.

| Task | Entry point |
|---|---|
| Start a season | From `database/misc/`: `npm ci`, then `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node start_new_season.js YYYY-YYYY [--make-current]`. Copies missing season/college/sport docs; `--make-current` updates configuration. |
| Convert a schedule workbook | `python3 database/misc/format_schedule.py /path/to/schedule.xlsx -o /tmp/schedule.csv --sport Soccer`; Python standard library only. Upload the CSV through the Hub. |

`database/misc` has no automated test script; its inherited
`npm test` placeholder intentionally fails.

## Releasing (maintainers)

The repository configures Firebase App Hosting backend `yaleims-1` in project
`yims-125a2`. The workflow below uses an explicit commit-pinned rollout.
Check the backend's live-branch/automatic-rollout settings and IAM in the
Firebase console before releasing; those settings are not proved by local files.
See Firebase's [rollout and rollback documentation](https://firebase.google.com/docs/app-hosting/rollouts).

1. Merge the reviewed change once checks pass and record its full commit SHA.
2. For changes to data or indexes, take a backup first, for example
   `gcloud firestore export gs://yims-125a2-backups/DATE-LABEL`.
   Review any backfill separately; a code rollback does not reverse data writes.
3. Deploy needed indexes from `database/`, then wait for them to become ready:
   `npx -y firebase-tools@14 deploy --only firestore:indexes --project yims-125a2`.
   Review proposed deletions before proceeding.
4. Run the pinned rollout:
   `npx -y firebase-tools@14 apphosting:rollouts:create yaleims-1 -g FULL_COMMIT_SHA --project yims-125a2`.
5. Check rollout/build logs, the live site signed out and in, relevant roles,
   and the feature's stored effects. Coordinate rules changes with the code
   that requires them; deploy compatible rules explicitly from `database/`:
   `npx -y firebase-tools@14 deploy --only firestore:rules --project yims-125a2`.

For rollback, use App Hosting's rollback controls to return to a known-good
build and restore compatible rules as needed. Verify data/index compatibility
before rollback. Avoid bare `firebase deploy`; target the intended resource.
`frontend/apphosting.yaml` contains deployment environment and Secret Manager
references. `JWT_SECRET` and `YALIES_API_KEY` are runtime secrets; changing the
session secret signs everyone out. Keep production secrets out of local files
and source control.
