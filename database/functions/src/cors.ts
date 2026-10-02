// cors.ts
// ----------------------------------------------------------------------------
// Single shared CORS handler for every HTTP Cloud Function.
//
// Previously each function constructed its own `cors({ origin: true })`, which
// reflects ANY origin. This centralizes that into one place so the policy can
// be tightened in exactly one spot later.
//
// Behavior today is UNCHANGED: when ALLOWED_ORIGINS is unset (the default), any
// origin is reflected — identical to the old `cors({ origin: true })`. To lock
// things down, set ALLOWED_ORIGINS to a comma-separated list, e.g.
//   ALLOWED_ORIGINS=https://yaleims.com,https://www.yaleims.com,http://localhost:3000
// (configure it as a function env var / in Secret Manager — no code change).
//
// NOTE: CORS is a *browser* control. It does not stop server-to-server or curl
// callers — the JWT verification in auth.ts is what actually protects data.
// ----------------------------------------------------------------------------
import cors from "cors";

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const corsHandler = cors({
  // No list configured -> reflect any origin (unchanged legacy behavior).
  // List configured -> only those origins are allowed.
  origin: allowedOrigins.length === 0 ? true : allowedOrigins,
});
