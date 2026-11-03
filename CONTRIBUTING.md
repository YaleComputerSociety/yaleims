# Contributing to YaleIMs

Start with the [README](README.md): the quick start gets the site running on
your machine against a local emulator, and "How it fits together" is the map
of the code. This file is the how-to.

## Branches, commits, pull requests

- Branch from `main`: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`,
  `refactor/<topic>` (or `<issue number>-<topic>`).
- Commit messages say what changed and why, in the
  [Conventional Commits](https://www.conventionalcommits.org) style:
  `fix(brackets): a winner advances when the seed is missing`.
- Before opening a pull request, from `frontend/`:
  ```bash
  npm run typecheck && npm run lint && npm test
  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:integration
  ```
  and click through the pages you touched (`npm run dev:emulator`, signed in
  with `npm run dev:token` as the roles that use them).
- The pull request says what changed, why, and how you tested it. CI must be
  green; a maintainer reviews and merges.
- Never commit secrets (`.env.local`, service account keys) or real people's
  data. The seed is made up on purpose.

## Adding an API route

Routes live at the URL they serve: `src/app/api/seasons/[seasonId]/matches/[matchId]/reports/route.ts`
is `/api/seasons/{s}/matches/{m}/reports`, which mirrors the Firestore path
`seasons/{s}/matches/{m}/scoreReports`. That file is a good one to copy.

1. **The contract** goes in `src/lib/api/<resource>.ts`, next to the
   resource's other calls: the zod schema of the body or query
   (`z.strictObject`, so unknown fields are refused), the response type (the
   document as `Json<WithId<Doc>>`, or an `Omit<>` of it when some readers
   mustn't see emails) and the typed client call (`request()`), which pages
   use.
2. **The handler** reads top to bottom: parse the URL params, check who is
   calling, validate the input, do the work, respond. From
   `app/api/seasons/[seasonId]/colleges/[collegeId]/mvps/[week]/route.ts`:
   ```ts
   export const PUT = route<Params>(async (req, { params }) => {
     const { seasonId, collegeId, week } = await readParams(params, mvpParamsSchema);
     const viewer = await authorize(can.nameMvps, collegeId);   // 401 / 403
     const { playerId } = await readBody(req, mvpAwardSchema);  // 400 on bad input
     const player = await getPlayer(seasonId, playerId);
     if (player?.collegeId !== collegeId) {
       throw new ApiError("bad-request", "They aren't a player of this college that season.");
     }
     await setMvp(seasonId, collegeId, { week, playerId, name: player.name, awardedBy: viewer.email });
     return noContent();                                        // or ok(body) / created({ id })
   });
   ```
   Throw `new ApiError("not-found" | "conflict" | …, "a message the user can
   read")` for expected failures; anything else becomes a logged, generic 500.
3. **Who may do it** is a named rule in `can` (`src/server/auth.ts`). Add one
   there rather than checking roles in the route, so every permission can be
   read in one place.
4. **Firestore access** goes through `src/server/data/<collection>.ts` (the
   only code that touches Firestore) or, when it spans collections or needs a
   transaction, a function in `src/server/services/`. Writes by admins,
   supervisors and reps are audit-logged in the same transaction
   (`logAction`).
5. **Tests:** add the route to the auth matrix
   (`tests/integration/auth-matrix.test.ts`: who gets 401/403/allowed) and its
   behavior to the resource's file in `tests/integration/`. Pure logic gets a
   unit test in `tests/unit/`.

Conventions: GET reads; POST creates (201 with the id); PATCH changes fields;
PUT sets something whole (idempotent); DELETE removes (204). Lists are
`{ items, total }`, paged with `page` and `pageSize` where they can be long.
"Today" and "this week" are Eastern days (`lib/dates.ts`). Errors are always
`{ error: { code, message } }`.

## Adding a page

- `src/app/<url>/page.tsx`; its components in `src/components/<area>/`.
  Static pages (no state) are server components.
- Get data with the `lib/api` client calls; the season, its sports and the
  colleges come from `useSeason()` (`context/SeasonContext`), the signed-in
  person from `useSession()` (`context/SessionContext`).
- A page that needs sign-in shows `SignInPrompt` when a call answers 401.
  Failed actions show their error's message in a toast; a failed background
  read keeps the page's empty state.
- Hub sections for a role go in `components/hub/<role>/` and are wired into
  `app/hub/page.tsx`.

## Adding a field or a collection

1. **The schema:** add it to the document's interface in
   `src/types/firestore.ts` with a comment saying what it means. A new
   collection also gets its path in `src/lib/paths.ts` and a module in
   `src/server/data/`.
2. **Existing documents** don't have the new field. Either read it with a
   default (`doc.field ?? fallback`), or backfill it with a one-off script
   that runs against the emulator first and in production only with a
   maintainer's go-ahead (after a backup).
3. **Queries** on the new field need an index in
   `database/firestore.indexes.json` when they combine filters or sort
   (the emulator doesn't enforce indexes; production answers "requires an
   index"). Index deploys are part of the release.
4. **Rules:** nothing to do unless the browser must read it live; the rules
   deny everything else (`database/firestore.rules`, tested in
   `tests/rules/`).
5. **The seed** (`scripts/seed.mts`) should produce realistic values, so the
   pages and tests see them.

## Tests

`frontend/tests/README.md` has the details. In short: unit tests
(`npm test`) for pure code; integration tests run the real API against the
emulator with the seed loaded (they wipe the emulator); rules tests check
what the browser may read. CI runs all of them on every pull request.

## Releasing (maintainers)

Production is Firebase App Hosting backend `yaleims-1` in project
`yims-125a2`. Automatic rollouts are off: every release is a deliberate,
pinned rollout.

1. Merge the pull request to `main` once CI is green.
2. If the release needs new indexes or touches existing data: take a
   backup (`gcloud firestore export gs://yims-125a2-backups/<date>-<what>`)
   and deploy the indexes first, from `database/`:
   `npx firebase-tools deploy --only firestore:indexes --project yims-125a2`.
   If it offers to delete indexes, answer no and find out why.
3. Roll out the exact commit:
   `npx firebase-tools apphosting:rollouts:create yaleims-1 -g <full commit sha> --project yims-125a2`.
4. Check the live site: every page, signed out and signed in, and the
   feature you shipped.
5. Rules changes go out **after** the build that needs them is live:
   `npx firebase-tools deploy --only firestore:rules --project yims-125a2`
   from `database/`.

**Rollback:** in the Firebase console (App Hosting → `yaleims-1` →
Rollouts), send traffic back to the previous build. If rules were deployed
with the release, put the previous rules back first.

Secrets (`JWT_SECRET`, `YALIES_API_KEY`) live in Cloud Secret Manager and
are only available at runtime (`frontend/apphosting.yaml`). Changing
`JWT_SECRET` signs everyone out.
