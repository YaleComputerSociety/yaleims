// The Yale login. Yale CAS says who someone is (their netid); Yalies gives
// their name, email and college. /api/auth/login sends people to CAS, CAS
// sends them back to /api/auth/redirect with a ticket, and the ticket is
// checked against the same service URL: CAS requires it byte-identical, so
// one function builds it for both (serviceUrl).
import "server-only";
import { parseStringPromise } from "xml2js";
import { safeReturnPath } from "@/lib/returnPath";
import type { YaliesProfile } from "./services/accounts";

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

/** The netid CAS vouches for with `ticket`, or null when CAS refuses it. */
export async function validateTicket(ticket: string, state: string): Promise<string | null> {
  const res = await fetch(
    `${casBase()}/serviceValidate?ticket=${encodeURIComponent(ticket)}&service=${encodeURIComponent(serviceUrl(state))}`
  );
  if (!res.ok) throw new Error(`CAS answered ${res.status}`);
  const xml = await parseStringPromise(await res.text());
  const netid = xml?.["cas:serviceResponse"]?.["cas:authenticationSuccess"]?.[0]?.["cas:user"]?.[0];
  return typeof netid === "string" && netid !== "" ? netid : null;
}

/** The person's Yalies profile, or null when Yalies has none (with an email) for the netid. Throws when Yalies can't be reached. */
export async function yaliesProfile(netid: string): Promise<YaliesProfile | null> {
  const [person] = await yaliesPeople({ netid: netid.toLowerCase() });
  return person ?? null;
}

/** The Yalies profiles of these emails (as many as Yalies knows), by email; at most 100 per call. */
export async function yaliesProfilesByEmail(emails: string[]): Promise<Map<string, YaliesProfile>> {
  const people = emails.length ? await yaliesPeople({ email: emails }, emails.length) : [];
  return new Map(people.map((p) => [p.email, p]));
}

/**
 * People from Yalies' directory: `filters` match exactly (any field; a
 * list matches any of its values; values are case-sensitive). Only people
 * with an email. YALIES_API_URL points it elsewhere (the integration tests'
 * fake directory).
 */
async function yaliesPeople(filters: Record<string, string | string[]>, pageSize = 10): Promise<YaliesProfile[]> {
  const key = process.env.YALIES_API_KEY;
  if (!key) throw new Error("YALIES_API_KEY is not set");
  const base = process.env.YALIES_API_URL ?? "https://api.yalies.io/v2";
  const res = await fetch(`${base}/people`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ filters, page_size: pageSize }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Yalies answered ${res.status}`);
  const people: unknown = await res.json();
  if (!Array.isArray(people)) throw new Error("Yalies answered something other than a list");
  return people.flatMap((p: Partial<YaliesProfile>) =>
    typeof p.email === "string" && p.email
      ? [
          {
            email: p.email,
            netid: typeof p.netid === "string" ? p.netid : null,
            first_name: p.first_name ?? "",
            last_name: p.last_name ?? "",
            college: p.college ?? null,
          },
        ]
      : []
  );
}
