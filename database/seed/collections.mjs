// Top-level Firestore collections that make up a meaningful seed dataset.
// Derived from the collections the app reads and writes (frontend/src/lib/paths.ts).
// The *_testing collections are intentionally excluded.
//
// If you add a new top-level collection to the app, add it here so it gets
// captured in the seed export.
export const SEED_COLLECTIONS = [
  "colleges",
  "matches",
  "users",
  "seasons",
  "sports",
  "counters",
  "tournaments",
  "elo",
  "bets",
  "usernames",
  "brackets",
  "mvps",
];

// Collections that contain user PII and must never leave prod un-sanitized.
// `api_keys` / `user_api_keys` are deliberately NOT exported at all.
export const EXCLUDED_COLLECTIONS = ["api_keys", "user_api_keys"];
