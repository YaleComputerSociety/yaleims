# Security — authentication & authorization model

How auth works in YIMS, what was fixed in the backend-auth hardening pass, and
what is still open. Read this before adding or changing a Cloud Function.

---

## The model

### Identity: a custom JWT, not Firebase Auth
The app does **not** use Firebase Authentication. Login is hand-rolled:

1. Frontend redirects to **Yale CAS**; CAS returns a ticket.
2. `frontend/src/app/api/auth/redirect` validates the ticket, looks the user up
   via the **Yalies API**, and mints an **HS256 JWT signed with `JWT_SECRET`**.
3. That JWT is stored two ways:
   - an **httpOnly `token` cookie** (used by the BFF routes), and
   - `sessionStorage.userToken` (used by components that call Cloud Functions
     directly from the browser).

Because it's a custom JWT, verification is `jwt.verify(token, JWT_SECRET)` —
**never** `admin.auth().verifyIdToken()` (that's for Firebase ID tokens and
would never validate these tokens).

### Why every function must verify
Each Cloud Function is a **public HTTP endpoint** (`onRequest`, `cors({origin:
true})`) reachable at its own URL. The frontend calls many of them **directly
from the browser**, bypassing the BFF. So auth **cannot** live only in the BFF —
**each function that touches protected data must verify the caller itself.**

### The chokepoint: `authenticateRequest`
`database/functions/src/auth.ts` is the single place that:
- reads the `Authorization: Bearer <jwt>` header,
- loads `JWT_SECRET` from Secret Manager (`versions/latest`, cached per
  instance),
- `jwt.verify`s the token and validates its shape (`isValidDecodedToken`),
- returns `{ ok: true, decoded }` or `{ ok: false, status, error }`.

It performs **authentication only**. Each function keeps its own
**authorization** check (role) at the call site:

```ts
const auth = await authenticateRequest(req);
if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
const decoded = auth.decoded;
// then, where a role is required:
if (!tokenHasRole(decoded, ["admin", "dev"])) {
  return res.status(403).json({ error: "Forbidden" });
}
```

---

## What the hardening pass changed & why

Before this pass, the verify logic was **copy-pasted inline in ~18 functions**,
each constructing a Secret Manager client and reading `JWT_SECRET` pinned to
`versions/1`. Two functions had it **commented out entirely**, and one
privileged function had **no auth at all**.

### 1. Closed three real holes
| Function | Was | Now |
|---|---|---|
| `updateUserRole` | **No auth** — anyone could POST and set any user's `role` (privilege escalation) | Verifies token + **requires `dev` role** (`tokenHasRole`), matching the `manage-user-roles` BFF route |
| `deleteBet` | Verify commented out; owner `email` taken from the **query string** (delete anyone's bets) | Verifies token; owner email is taken from the **verified token**, so a user can only delete their own bets |
| `scoreMatchTesting` | Deployed, privileged scoring, no auth, no caller | **Unregistered** from `index.ts` (will not deploy) |

### 2. Centralized the other ~18 verifiers
Every function that already verified now calls `authenticateRequest` instead of
its own inline block. This removes the duplication, fixes the fragile
`versions/1` pin, and means there is exactly one implementation to audit.
**Each function's existing role check was preserved unchanged** — this pass did
not alter any endpoint's authorization policy.

### 3. `versions/1` → `versions/latest`
The secret is now read from `versions/latest`, so rotating `JWT_SECRET` in
Secret Manager takes effect on new function instances without a code change.
**Deploy note:** the functions' runtime service account already has
`secretmanager.secretAccessor` on the `JWT_SECRET` secret (it read `versions/1`
before); `latest` uses the same grant, so no IAM change is required.

### 4. Declared `jsonwebtoken`
`jsonwebtoken` was used but not declared in `functions/package.json` (resolved
only transitively). It is now an explicit dependency, with `@types/jsonwebtoken`.

---

## Endpoints intentionally left public (unauthenticated reads)

These serve public site data and are **meant** to be open — do not add auth
without checking the public pages that call them:
`getMatches`, `getMatchesPaginated(v2)`, `getSeasons`, `getLeaderboard`,
`getUserLeaderboard`, `getTournaments`, `getCollege`, `getCollegeMatches`,
`fetchOrAddUser` (called during login, before a token exists).

The public REST API (`/api/v1/getLeaderboard`, `publicApiSignup`) uses a
separate **API-key** scheme, not the user JWT.

---

## Residual risks / follow-ups (NOT addressed in this pass)

1. **`cors({ origin: true })` on mutations** — any website can call these
   endpoints cross-origin. Consider restricting origins, or routing all
   mutations through the BFF and locking functions to a server-only caller.
2. **JWT in `sessionStorage`** — readable by any injected script (XSS). The
   httpOnly cookie is the safer store; the direct browser→function calls are the
   reason the token is also in `sessionStorage`.
3. **`assignRemoveCaptain` checks identity but not an elevated role** — any
   authenticated user may assign/remove captains. Behavior was preserved in this
   pass; decide whether it should require `admin`/`dev`.
4. **`updateUserRole` is legacy/duplicated.** It writes the old `role` /
   `teams_captain_of` schema, while the `manage-user-roles` BFF route writes
   `mRoles` / `sportsCaptainOf` directly. Two role-management paths exist
   (`AssignRoles.tsx` → this function; `manage-user-roles` page → BFF). Auth is
   now closed on both, but the duplication/schema drift should be resolved.
5. **Orphaned file:** `scoreMatchTesting.ts` is unregistered but the source file
   still exists — delete it (`rm database/functions/src/scoreMatchTesting.ts`).
6. **`cors` is also an undeclared (transitive) dependency** in
   `functions/package.json`, same class of issue as `jsonwebtoken` — declare it.

---

## Verification

All changes typecheck (`tsc --noEmit` in `database/functions`). Behavioral
verification should be done against the **emulator** (see `../TESTING.md`): mint
a JWT with the local `JWT_SECRET`, then confirm (a) a valid token passes, (b) a
missing/garbage token gets 401, and (c) `updateUserRole` returns 403 for a
non-`dev` token.
