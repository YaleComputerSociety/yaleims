// Central registry for Cloud Function endpoints.
//
// Why this exists: the frontend (BFF routes + a few client components) used to
// inline the production Cloud Run URL for every function, e.g.
//   https://getseasons-65477nrg6a-uc.a.run.app
// That hardcoded the project (yims-125a2) in 20+ places and made it impossible
// to point the app at the Firebase Emulator Suite or a QA project.
//
// `functionUrl(name)` returns the correct base URL for the current environment.
// In production it reproduces the exact same Cloud Run URL as before, so
// behavior is unchanged. When NEXT_PUBLIC_USE_EMULATOR === "true" it returns the
// local Functions-emulator URL instead. Callers append their own query string.
//
// Every function is 2nd gen (firebase-functions v6's root export is v2), so each
// one is reachable at both its run.app URL and the legacy alias
// https://us-central1-yims-125a2.cloudfunctions.net/<name>. Always use this
// helper rather than either hardcoded form.

/** Cloud Run URL discriminator for the production project (yims-125a2). */
const PROD_RUN_HASH = "65477nrg6a-uc";

/** Firebase project id + region, used to address the local Functions emulator. */
const PROJECT_ID = "yims-125a2";
const REGION = "us-central1";

/** Default Functions-emulator host:port (see firebase.json `emulators.functions`). */
const EMULATOR_HOST =
  process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001";

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";

/**
 * Canonical (exported) names of every Cloud Function the frontend calls.
 * Keep this list in sync with the exports in
 * database/functions/src/index.ts. Using a union gives us compile-time
 * protection against typos in endpoint names.
 */
export const FUNCTION_NAMES = [
  "getMatchesPaginated",
  "getMatchesPaginatedv2",
  "addParticipant",
  "removeParticipant",
  "assignRemoveCaptain",
  "scoreMatch",
  "undoScoreMatch",
  "setMVP",
  "updateUsername",
  "fetchOrAddUser",
  "addSchedule",
  "createBracket",
  "deleteBracket",
  "createTournament",
  "deleteTournament",
] as const;

export type FunctionName = (typeof FUNCTION_NAMES)[number];

/**
 * Base URL (no query string) for a Cloud Function.
 *
 * Production: https://<name-lowercased>-65477nrg6a-uc.a.run.app  (unchanged)
 * Emulator:   http://<host:port>/<project>/<region>/<name>
 */
export function functionUrl(name: FunctionName): string {
  if (USE_EMULATOR) {
    return `http://${EMULATOR_HOST}/${PROJECT_ID}/${REGION}/${name}`;
  }
  return `https://${name.toLowerCase()}-${PROD_RUN_HASH}.a.run.app`;
}
