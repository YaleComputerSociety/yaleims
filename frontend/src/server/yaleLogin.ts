// The Yale login. Yale CAS says who someone is (their netid); the directory
// (server/directory.ts) gives their name, email and college. /api/auth/login
// sends people to CAS, CAS sends them back to /api/auth/redirect with a ticket, and the ticket is
// checked against the same service URL: CAS requires it byte-identical, so
// one function builds it for both (serviceUrl).
import "server-only";
import { parseStringPromise } from "xml2js";
import { safeReturnPath } from "@/lib/returnPath";

function baseUrl(): string {
  const base = process.env.BASE_URL;
  if (!base) throw new Error("BASE_URL is not set");
  return base.replace(/\/$/, "");
}

/** Yale's test CAS for local development on :3000, the real one everywhere else. */
function casBase(): string {
  return baseUrl() === "http://localhost:3000"
    ? "https://secure-tst.its.yale.edu/cas"
    : "https://secure.its.yale.edu/cas";
}

/** The same browser-bound service URL for login and validation; return paths stay server-side. */
function serviceUrl(state: string): string {
  return `${baseUrl()}/api/auth/redirect?state=${encodeURIComponent(state)}`;
}

/** The page on this site to return to after login ("/" for anything else: no open redirect). */
export function returnPath(from: string | null): string {
  return safeReturnPath(from, baseUrl());
}

/** The full URL of `path` on this site. */
export function siteUrl(path: string): string {
  return baseUrl() + path;
}

/** CAS's login page, which comes back with this attempt's state. */
export function casLoginUrl(state: string): string {
  return `${casBase()}/login?service=${encodeURIComponent(serviceUrl(state))}`;
}

/** The netid CAS vouches for with `ticket`, or null when CAS refuses it. Throws when CAS is down or slow (10 s). */
export async function validateTicket(ticket: string, state: string): Promise<string | null> {
  const res = await fetch(
    `${casBase()}/serviceValidate?ticket=${encodeURIComponent(ticket)}&service=${encodeURIComponent(serviceUrl(state))}`,
    { signal: AbortSignal.timeout(10_000) }
  );
  if (!res.ok) throw new Error(`CAS answered ${res.status}`);
  const xml = await parseStringPromise(await res.text());
  const netid = xml?.["cas:serviceResponse"]?.["cas:authenticationSuccess"]?.[0]?.["cas:user"]?.[0];
  return typeof netid === "string" && netid !== "" ? netid : null;
}
