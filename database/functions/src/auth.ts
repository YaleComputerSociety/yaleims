// auth.ts
// ----------------------------------------------------------------------------
// Shared authentication for the HTTP Cloud Functions.
//
// Why this exists
// ---------------
// Every function is a public `onRequest` endpoint reachable at its own URL, and
// the frontend calls many of them directly from the browser. Auth therefore
// cannot live only in the BFF layer — each function must verify the caller.
//
// Previously ~18 functions each inlined the same block: construct a
// SecretManagerServiceClient, read `JWT_SECRET` (pinned to `versions/1`), then
// `jwt.verify`. That was duplicated, easy to get subtly wrong (two endpoints had
// it commented out entirely → unauthenticated), and pinned to a single secret
// version so rotation would silently break verification.
//
// `authenticateRequest` centralizes that logic. It does NOT make authorization
// decisions — callers still check roles with `tokenHasRole` (helpers.ts) or
// their own predicate, so each endpoint keeps its existing policy.
//
// Auth model note: the token is the app's own HS256 JWT signed with JWT_SECRET
// (minted by the CAS callback in the frontend), NOT a Firebase ID token. So we
// verify with `jwt.verify` + the shared secret, never `admin.auth()`.
// ----------------------------------------------------------------------------
import jwt from "jsonwebtoken";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { DecodedToken, isValidDecodedToken } from "./helpers.js";

// `latest` (not a pinned version) so rotating the secret in Secret Manager takes
// effect without a code change. The running instance caches the value, so a
// rotation is picked up by new function instances.
const JWT_SECRET_RESOURCE =
  "projects/yims-125a2/secrets/JWT_SECRET/versions/latest";

let cachedSecret: string | null = null;
let secretClient: SecretManagerServiceClient | null = null;

async function getJwtSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  // Testability fallback: when JWT_SECRET is provided as an env var (the
  // Functions emulator via functions/.env.local, or CI) use it directly and
  // skip the Secret Manager call. Production functions set no such env var, so
  // they continue to read from Secret Manager unchanged.
  if (process.env.JWT_SECRET) {
    cachedSecret = process.env.JWT_SECRET;
    return cachedSecret;
  }
  if (!secretClient) secretClient = new SecretManagerServiceClient();
  const [version] = await secretClient.accessSecretVersion({
    name: JWT_SECRET_RESOURCE,
  });
  const data = version.payload?.data?.toString();
  if (!data) throw new Error("JWT secret payload is missing");
  cachedSecret = data;
  return cachedSecret;
}

export type AuthResult =
  | { ok: true; decoded: DecodedToken }
  | { ok: false; status: number; error: string };

/**
 * Verify the `Authorization: Bearer <jwt>` header on an incoming request.
 *
 * Returns `{ ok: true, decoded }` on success, or `{ ok: false, status, error }`
 * with the status the caller should return (401 for a missing/invalid token,
 * 500 if the secret can't be loaded). Authorization (role checks) is the
 * caller's responsibility.
 */
export async function authenticateRequest(req: {
  headers: { authorization?: string | string[] };
}): Promise<AuthResult> {
  const raw = req.headers.authorization;
  const authHeader = Array.isArray(raw) ? raw[0] : raw || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No token provided" };
  }
  const token = authHeader.slice("Bearer ".length);

  let secret: string;
  try {
    secret = await getJwtSecret();
  } catch (err) {
    console.error("Failed to load JWT secret:", err);
    return { ok: false, status: 500, error: "Internal Server Error" };
  }

  let decoded: unknown;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return { ok: false, status: 401, error: "Invalid token" };
  }

  if (!isValidDecodedToken(decoded)) {
    return { ok: false, status: 401, error: "Invalid token" };
  }

  return { ok: true, decoded };
}
